const Discord = require('discord.js');
const settings = require('../settings');
const coreThoughts = require('./coreThoughts');
const insult = require('../commands/insult');
const game = require('../commands/game');
const Chance = require('chance');
const eyes = require('./birdEyes');
const {Brain} = require('./brain');
const zalgo = require('zalgo-js');

const guildBrains = {};
// const chance = new Chance();
const auditHistory = {};
let audit = {
  timestamp: Date.now()
};

let messagesSince = 0;
let mostRecent, makeNoise, noiseTimeout;

eyes.fetch().catch(console.error);
eyes.stream().catch(console.error);

const sendChatter = (channel, text, options) => {
  const a = audit;
  channel.send(text, options).then((sentMessage) => {
    const chance = new Chance(sentMessage.id);
    if(chance.bool({likelihood: 1})) {
      sentMessage.edit(zalgo.default(sentMessage.content)).catch(console.error);
    }
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

module.exports.run = async (message = mostRecent, client) => {
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
  const thursdayMultiplier = new Date().getDay() === 4 ? 2 : 1;
  const chatFrequency = randomChat * thursdayMultiplier;
  const roll = chance.bool({ likelihood: (chatFrequency)}); console.log('[Chatter]', roll, `${(messagesSince/(chatFrequency*100)).toFixed(3)}`, channel.name, author.tag);
  audit.likelihood = messagesSince/(chatFrequency*100);

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
      exports.run(mostRecent, client).catch(console.error);
    }, noiseTimeout);
  }
  guildBrains[guild.id].addMessage(message);
  mostRecent = message;

  const hasTriggerWord = (m) => {
    return !(triggerWords.findIndex(tw => m.toLowerCase().includes(tw)) < 0);
  };


  if ((isHonk || isMentioned || roll || hasTriggerWord(content)) && !author.bot && !ignoredChannels.includes(channel.name)) {
    const member = await guild.members.fetch(author).catch(console.warn);
    const hasRole = member.roles.cache.find(r => r.name == 'Bot Abuser');
    if (!hasRole) {
      audit.sentOn = content;
      // Roll for critical
      const critRoll = chance.bool({likelihood: 2 * thursdayMultiplier});

      if (critRoll) console.log('Critical roll!');

      critRoll ? sendSourString(honkChannel, message) : sendMarkovString(honkChannel, message);
    }
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
        console.debug('<INSULT>');
        insult.getInsult((insult) => {
          sendChatter(channel, insult);
        }, message);
      }
    },
    {
      name: 'coreThought',
      weight: 1.2,
      task: () => {
        console.debug('<CORE THOGUHT>');
        const ct = coreThoughts.raw || [];
        sendChatter(channel, chance.pickone(ct));
      }
    },
    {
      name: 'react',
      weight: 4,
      task: () => {
        console.debug('<REACT>');
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

const sendMarkovString = async (channel, message) => {
  const contentSize = Object.values(guildBrains[channel.guildId].corpus.data).length;
  console.log('[Generating String]', contentSize);

  const config = settings.settings.chatter;
  const { id, content } = message;
  const { guildId } = channel;
  const { maxTries = 10, disableImage = false, mentions = true, weights = [100, 25, 25, 1] } = config;
  const chance = new Chance(id);

  const sentenceGenerationTypes =  [
    {
      name: 'Guild Corpus',
      weight: weights[0],
      task: async () => {
        console.log('[Guild used]');
        const options = {
          maxTries, // Give up if I don't have a sentence after N tries (default is 10)
          // prng: Math.random, // An external Pseudo Random Number Generator if you want to get seeded results
          prng: guildBrains[guildId].generateWordSeakingRandom(content),
          filter: Brain.generateFilter(content, channel)
        };
        return await guildBrains[guildId].createSentence(options).catch((e) => {
          console.warn(e);
          return {
            string: guildBrains[guildId].getRandomWord(),
            refs: []
          };
        });
      }
    },
    {
      name: 'Twitter Corpus',
      weight: weights[1],
      task: async () => {
        console.log('[Twitter used]');
        return await eyes.generateTweet().catch(console.error).finally(() => {
          eyes.fetch(guildBrains[guildId].getRandomWord()).catch(console.error);
          eyes.stream().catch(console.error);
        });
      }
    },
    {
      name: 'Guild Emoji',
      weight: weights[2],
      task: async () => {
        console.debug('<GUILD EMOJI>');
        return { string: channel.client.emojis.cache.random().toString() };
      }
    },
    {
      name: 'Core',
      weight: weights[2],
      task: async () => {
        console.debug('<CORE>');
        return { string: chance.pickone(coreThoughts.raw) };
      }
    }
  ];
  const ws = [];
  const tsks = [];
  sentenceGenerationTypes.forEach((v) => {
    ws.push(v.weight);
    tsks.push(v);
  });
  const picked = chance.weighted(tsks, ws);
  audit.source = picked.name;
  const { string = chance.sentence(), refs = [] } = await picked.task().catch((error) => {
    console.error(error);
    return {
      string: chance.sentence(),
      refs: []
    };
  });
  console.log(string);
  let attachments = [];
  let files = [];
  if (!disableImage) refs.forEach(ref => attachments = attachments.concat(ref.attachments));
  audit.refs = refs.flatMap(r => r.string);
  files = attachments.size > 0 ? [attachments.random()] : [];

  return sendChatter(channel,
    !mentions ? Discord.Util.cleanContent(string, channel.lastMessage) : string,
    {
      embeds: files
    });

};

settings.loadConfig();
