const Discord = require('discord.js');
// const mathjs = require('mathjs');
// const Markov = require('markov-strings').default;
const settings = require('../settings');
const coreThoughts = require('./coreThoughts');
const insult = require('../commands/insult');
const game = require('../commands/game');
const Chance = require('chance');
const eyes = require('./birdEyes');
const chatterUtil = require('./util');
const {Brain} = require('./brain');

const guildBrains = {};
const chance = new Chance();
const auditHistory = {};
let audit = {
  timestamp: Date.now()
};

let messagesSince = 0;
let mostRecent, makeNoise, noiseTimeout;

eyes.fetch();

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
    const channelsToScrape = guild.channels.cache.filter(ch => ch.isText() && ch.viewable && !ch.nsfw && !disabled.includes(ch.name));
    const brain = guildBrains[guild.id] = new Brain(guild);
    learningTasks.push(brain.scrapeGuildHistory(channelsToScrape));
  });
  Promise.all(learningTasks).then(done => {
    console.log('[Finished creating models.]', done.length);
    console.log('[Finished scraping.]', done.map(guildData => guildData.length));
    client.user.setStatus('online');
    client.user.setActivity('👀', { type: 'WATCHING' });
  });
};

module.exports.run = (message = mostRecent, client) => {
  audit = {};
  const { author, channel, content, guild, mentions } = message;
  const config = settings.settings.chatter;
  const triggerWords = config.triggerWords || [];
  const ignored = config.ignoredChannels || [];
  const noiseFrequency = (config.frequency * 60000) || 60 * 60000;
  const isMentioned = mentions.has(client.user.id);
  const honkChannel = (isMentioned && config.useHonk) ? theHonk : channel;
  const isHonk = channel.name === 'honk';
  const theHonk = guild.channels.cache.find(ch => ch.name === 'honk') || channel;
  const roll = chance.bool({ likelihood: (config.randomChat)}); console.log(roll, `${messagesSince/(config.randomChat*100)}`, channel.name, author.tag);
  audit.likelihood = messagesSince/(config.randomChat*100);

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

      console.log('[Silence Breaker]', mostRecent.channel.name);

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


  if ((isHonk || isMentioned || roll || hasTriggerWord(content)) && !author.bot && !ignored.includes(channel.name)) {
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

        critRoll ? sendSourString(honkChannel, message, client) : sendMarkovString(honkChannel, content);
      }
    });
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

const sendSourString = (channel, message, client) => {
  const sourString = [
    {
      name: 'insult',
      weight: 1,
      task: () => {
        sendChatter(channel, insult.getInsult(message));
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
        message.react(client.emojis.cache.random().id).catch(console.error);
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

  console.log('okay', Object.values(guildBrains[channel.guildId].corpus.data).length);

  let chatter = '🤫';
  let files = [];
  const guildId = channel.guildId;
  const config = settings.settings.chatter;
  channel.sendTyping().then(() => {
    if (!config.mentions) chatter = Discord.Util.cleanContent(chatter, channel.lastMessage);
    sendChatter(channel, chatter, { embeds: files });
  });
  const refsScore = (refs) => { // this may be too agressive.
    let score = 0;
    const channelInfluence = config.channelInfluence || 2;
    const theHonk = channel.guild.channels.cache.find(ch => ch.name === 'honk');
    refs.forEach(ref => {
      score += ref.channel === channel.id ? channelInfluence : -channelInfluence;
      if(theHonk) {
        score += ref.channel === theHonk.id ? channelInfluence*2 : 0;
      }
    });
    return score;
  };
  const minimumScore = config.minimumScore || 2;
  const maxTries = 20;
  const options = {
    maxTries, // Give up if I don't have a sentence after N tries (default is 10)
    // prng: Math.random, // An external Pseudo Random Number Generator if you want to get seeded results
    prng: guildBrains[guildId].generateWordSeakingRandom(content),
    filter: (result) => {
      // const metScoreConstraints = chatterUtil.wordScore(result.string, content) + refsScore(result.refs) >= minimumScore;
      console.debug('Channel Ref score:', refsScore(result.refs));
      const metScoreConstraints = chatterUtil.wordScore(result.string, content) >= minimumScore;
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

  };
  const sentenceFallbackHandler = (e) => {
    if (e) console.error(e);
    console.log('[Couldn\'t generate sentence with constraints]');
    const failsafe = () => {
      chatter = channel.client.emojis.cache.random().toString();
      audit.refs = 'Skipped. Did not meet constraints.';
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
    if(chance.bool({likelihood:95})) {
      guildBrains[guildId].createSentence({...tOpt, maxTries: 500}).then(sentenceResultHandler).catch(() => {
        failsafe();
      });
    } else {
      eyes.generateTweet(tOpt).then(result => {
        chatter = result.string;
        audit.refs = result.refs.flatMap(r => r.string);
        audit.source = 'Twitter';
      }).catch(() => {
        failsafe();
      }).finally(() => {
        eyes.fetch();
      });
    }

  };

  guildBrains[guildId].createSentence(options).then(sentenceResultHandler).catch(sentenceFallbackHandler);
};

settings.loadConfig();
