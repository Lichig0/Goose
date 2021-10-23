const Discord = require('discord.js');
const settings = require('../settings');
const coreThoughts = require('./coreThoughts');
const insult = require('../commands/insult');
const game = require('../commands/game');
const Chance = require('chance');
const eyes = require('./birdEyes');
const chatterUtil = require('./util');
const {Brain} = require('./brain');

const guildBrains = {};
// const chance = new Chance();
const auditHistory = {};
let audit = {
  timestamp: Date.now()
};

let messagesSince = 0;
let mostRecent, makeNoise, noiseTimeout;

eyes.fetch();
eyes.stream();

const sendChatter = (channel, text, options) => {
  const a = audit;

  channel.send(text, options).then((sentMessage) => {
    a.timestamp = Date.now();
    auditHistory[sentMessage.id] = a;
  }).catch(console.error);
};

module.exports.audit = (params) => {
  if (auditHistory[params] !== undefined) {
    return auditHistory[params];
  }
  return audit;
};

module.exports.init = async (client) => {
  const config = settings.settings.chatter;
  const disabled = config.disabledChannels || [];
  const learningTasks = [];

  client.guilds.cache.each(guild => {
    const channelsToScrape = guild.channels.cache.filter(ch => ch.isText() && ch.viewable && !disabled.includes(ch.name));
    const brain = guildBrains[guild.id] = new Brain(guild);
    learningTasks.push(brain.scrapeGuildHistory(channelsToScrape));
  });
  Promise.all(learningTasks).then(done => {
    console.log('[Finished creating models.]', done.length);
    console.log('[Finished scraping.]', done.map(guildData => guildData.length));
    Object.values(guildBrains).map(gb=>gb.clearGuildCache());
    client.user.setStatus('online');
    client.user.setActivity('👀', { type: 'WATCHING' });
  }).catch(console.warn);
};

module.exports.addGuildBrain = async (guild) => {
  // TODO: must fetch channel list, a new server would have no cache
  const channelsToScrape = guild.channels.cache.filter(ch => ch.isText() && ch.viewable && !ch.nsfw);
  const brain = guildBrains[guild.id] = new Brain(guild);
  return brain.scrapeChannelHistory(channelsToScrape).catch(console.warn);
};

module.exports.run = (message = mostRecent, client) => {
  const { author, channel, content, guild, mentions } = message;
  const chance = new Chance(message.id);
  const optedOutIds = client.optedOutUsers.map(({userId}) => userId);
  audit = {};
  if(optedOutIds.includes(author.id)) return;
  const config = settings.settings.chatter;
  const {triggerWords = [], ignoredChannels = [], frequency = 60, useHonk, randomChat } = config;
  const noiseFrequency = (frequency * 60000);
  const isMentioned = mentions.has(client.user.id);
  const honkChannel = (isMentioned && useHonk) ? theHonk : channel;
  const isHonk = channel.name === 'honk';
  const theHonk = guild.channels.cache.find(ch => ch.name.includes('honk')) || channel;
  const roll = chance.bool({ likelihood: (randomChat)}); console.log('[Chatter]', roll, `${(messagesSince/(randomChat*100)).toFixed(3)}`, channel.name, author.tag);
  audit.likelihood = messagesSince/(randomChat*100);

  // TODO: move this into it's own file; loaded in as something that happens every message.
  if(Math.abs(1 - audit.likelihood) < 0.015) {
    const playGame = chance.bool({likelihoood: 0.4});
    if (playGame) {
      game.getGame((game) => {
        client.user.setActivity(`🎮 ${game.name}`);
      });
    } else {
      client.user.setActivity('👀', { type: 'WATCHING' });
    }
  }
  roll ? messagesSince = 0 : messagesSince++;

  if(makeNoise) {
    if (noiseTimeout !== noiseFrequency) {
      makeNoise.close();
      makeNoise = undefined;
    } else {
      makeNoise.refresh();
    }
  } else {
    noiseTimeout = noiseFrequency;
    makeNoise = setTimeout(() => {
      exports.run(mostRecent, client);
    }, noiseTimeout);
  }
  guildBrains[guild.id].addMessage(message);
  mostRecent = message;

  const hasTriggerWord = (m) => {
    return !(triggerWords.findIndex(tw => m.toLowerCase().includes(tw)) < 0);
  };

  const searchForEggs = (message) => {
    const { content } = message;
    if(content.toLowerCase().includes('this discord sucks')) {
      return () => {
        return {likelihood: 100, string: 'Fucking leave then.'};
      };
    }
  };


  if ((isHonk || isMentioned || roll || hasTriggerWord(content)) && !author.bot && !ignoredChannels.includes(channel.name)) {
    guild.members.fetch(author).then(m => {
      const hasRole = m.roles.cache.find(r => r.name == 'Bot Abuser');
      if (!hasRole) {
        audit.sentOn = content;
        const easterEgg = searchForEggs(message);
        if(easterEgg) {
          // Roll for rotten egg
          const rottenRoll = chance.bool({likelihood: easterEgg().likelihood});
          if (rottenRoll) return sendChatter(honkChannel, easterEgg().string);
        }
        // Roll for critical
        const critRoll = chance.bool({likelihood: 2});

        if (critRoll) console.log('Critical roll!');

        critRoll ? sendSourString(honkChannel, message) : sendMarkovString(honkChannel, content);
      }
    }).catch(console.warn);
  }

  const chanCache = message.channel.messages.cache.last(10).reverse().slice(0,10);
  const microTrend = chanCache.reduce((accumulate, currentVal) => {
    if(currentVal.content === message.content && currentVal.author.id !== message.author.id) {
      return accumulate += 1;
    } else if (accumulate == 3) {
      return accumulate;
    } else {
      return accumulate = 0;
    }
  }, false);
  if(microTrend == 3) channel.send(message.content).catch(console.warn);
};

const sendSourString = (channel, message) => {
  const chance = new Chance(message.id);
  const sourString = [
    {
      name: 'insult',
      weight: 1,
      task: () => {
        insult.getInsult((insult) => {
          sendChatter(channel, insult);
        }, message);
      }
    },
    {
      name: 'coreThought',
      weight: 1.2,
      task: () => {
        const ct = coreThoughts.raw || [];
        sendChatter(channel, chance.pickone(ct));
      }
    },
    {
      name: 'react',
      weight: 4,
      task: () => {
        message.react(message.client.emojis.cache.random().id).catch(console.error);
      }
    }
  ];
  const ws = [];
  const tsks = [];
  sourString.forEach((v) => {
    ws.push(v.weight);
    tsks.push(v.task);
  });
  chance.weighted(tsks, ws)();
};

const sendMarkovString = async (channel, content) => {
  const contentSize = Object.values(guildBrains[channel.guildId].corpus.data).length;
  console.log('okay', contentSize);
  const chance = new Chance(content);
  await channel.sendTyping();

  let chatter = '🤫';
  let files = [];
  const guildId = channel.guildId;
  const config = settings.settings.chatter;
  const refsScore = (refs) => { // this may be too agressive.
    let score = 0;
    const channelInfluence = config.channelInfluence || 2;
    refs.forEach(ref => {
      score += ref.channel === channel.id ? channelInfluence : -channelInfluence;
    });
    return score;
  };
  const minimumScore = config.minimumScore || 2;
  const maxTries = 10;
  const options = {
    maxTries, // Give up if I don't have a sentence after N tries (default is 10)
    // prng: Math.random, // An external Pseudo Random Number Generator if you want to get seeded results
    prng: guildBrains[guildId].generateWordSeakingRandom(content),
    filter: (result) => {
      const metScoreConstraints = chatterUtil.wordScore(result.string, content) + refsScore(result.refs) >= minimumScore;
      console.debug('Channel Ref score:', refsScore(result.refs));
      // const metScoreConstraints = chatterUtil.wordScore(result.string, content) >= minimumScore;
      const metUniqueConstraint = result.refs.length >= 2 && !result.refs.includes(result.string);
      const metPairsConstraints = chatterUtil.hasPairs(result.string);
      const hasNSFWRef = result.refs.reduce(chatterUtil.nsfwCheck , false);
      const metNSFWConstraints = hasNSFWRef.nsfw ? channel.nsfw : true;

      return metScoreConstraints && metPairsConstraints && metNSFWConstraints && metUniqueConstraint;
    }
  };

  const sentenceResultHandler = (result) => {
    const config = settings.settings.chatter;
    let attachments = [];
    chatter = result.string;

    if (!config.disableImage) result.refs.forEach(ref => attachments = attachments.concat(ref.attachments));
    audit.refs = result.refs.flatMap(r => r.string);
    files = attachments.size > 0 ? [attachments.random()] : [];
    if (!config.mentions) chatter = Discord.Util.cleanContent(chatter, channel.lastMessage);
    return sendChatter(channel, chatter, { embeds: files });
  };

  const sentenceFallbackHandler = () => {
    console.log('[Couldn\'t generate sentence with constraints]');
    const failsafe = () => {
      console.log('[Failsafe used]');
      const failsafeArray = [
        channel.client.emojis.cache.random().toString(),
        guildBrains[guildId].getRandomWord(),
        chance.sentence(),
        `${chance.syllable()}.`,
        chance.pickone(coreThoughts.raw),
      ];
      chatter = chance.pickone(failsafeArray);
      audit.refs = 'Skipped. Did not meet constraints.';
      sendChatter(channel, chatter);
    };
    const minimumScore = config.minimumScore || 2;
    const tOpt = {
      maxTries: 10,
      filter: (r) => {
        const multiRef = r.refs.length;
        const goodLength = chatterUtil.wordScore(r.string);
        return (multiRef + goodLength) >= minimumScore && !r.refs.includes(r.string);
      }
    };
    if(chance.bool({likelihood: 25})) {
      console.log('[Trying again.]');
      // guildBrains[guildId].createSentence({...options, maxTries: (contentSize / 10)}).then(sentenceResultHandler).catch(failsafe);
      guildBrains[guildId].createSentence(options).then(sentenceResultHandler).catch(failsafe);
    } else if(chance.bool({likelihood: 36})) {
      failsafe();
    } else {
      console.log('[Twitter used]');
      eyes.generateTweet(tOpt).then(result => {
        chatter = result.string;
        audit.refs = result.refs.flatMap(r => r.string);
        audit.source = 'Twitter';
        sendChatter(channel, chatter);
      }).catch(() => {
        failsafe();
      }).finally(() => {
        eyes.fetch();
        eyes.stream();
      });
    }

  };

  return guildBrains[guildId].createSentence(options).then(sentenceResultHandler).catch(sentenceFallbackHandler);
};

settings.loadConfig();
