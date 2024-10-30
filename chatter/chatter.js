const { ChannelType, AllowedMentionsTypes, MessagePayload, AttachmentBuilder } = require('discord.js');
const settings = require('../settings');
const util = require('./util');
const coreThoughts = require('./coreThoughts');
const insult = require('../commands/insult');
const Chance = require('chance');
const wikiRead = require('./wikireader');
const { Brain } = require('./brain');
const zalgo = require('zalgo-js');
const Action = require('./Action').default;
const sampleChain = require('./sampleCorpus');

const chance = new Chance();
const guildBrains = {};
const auditHistory = {};
let audit = {
  timestamp: Date.now()
};

let messagesSince = 0;
const deadChatIntervals = {};

wikiRead.addDailyWiki();
wikiRead.addRandomWiki();
(async () => sampleChain.init())();

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
    const channelsToScrape = guild.channels.cache.filter(ch => ch.type === ChannelType.GuildText && ch.viewable && !disabled.includes(ch.name));
    const brain = guildBrains[guild.id] = new Brain(guild);
    learningTasks.push(brain.scrapeGuildHistory(channelsToScrape).catch(console.error));
  });

  Promise.all(learningTasks).then(done => {
    console.log('[Finished creating models]', `${done.length} Guilds`);
    console.log('[Finished scraping.]', done.map(guildData => `${guildData.length} channels`));
    client.user.setStatus('online');
    client.user.setActivity('👀', { type: 'WATCHING' });
  }).catch(console.warn);
};

module.exports.addGuildBrain = async (guild) => {
  // TODO: must fetch channel list, a new server would have no cache
  const channelsToScrape = guild.channels.cache.filter(ch => ch.type === ChannelType.GuildText && ch.viewable && !ch.nsfw);
  const brain = guildBrains[guild.id] = new Brain(guild);
  return brain.scrapeChannelHistory(channelsToScrape).catch(console.warn);
};

module.exports.run = async (message, client) => {
  if(!message) throw new Error('Message is required: ', message);
  const { author, channel, content, guild, mentions } = message;
  const optedOutIds = client.optedOutUsers.map(({userId}) => userId);
  audit = {};
  if(optedOutIds.includes(author.id)) return;
  const config = settings.settings.chatter;
  const { ignoredChannels = [], frequency = 60, useHonk, randomChat, wobble = 2 } = config;
  const noiseFrequency = frequency * 60000;
  const isMentioned = mentions.has(client.user.id);
  const honkChannel = isMentioned && useHonk ? theHonk : channel;
  const isHonk = channel.name === 'honk';
  const theHonk = guild.channels.cache.find(ch => ch.name.includes('honk')) || channel;
  const thursdayMultiplier = new Date().getDay() === 4 ? 1.5 : 1;
  const chatFrequency = randomChat * thursdayMultiplier;
  const roll = chance.bool({ likelihood: chatFrequency}); console.log('[Chatter]', roll, `${(messagesSince/(chatFrequency*100)).toFixed(3)}`, guild.name, channel.name, author.tag);
  audit.messagesSince = messagesSince;
  audit.likelihood = messagesSince/(chatFrequency*100);

  // TODO: move this into it's own file; loaded in as something that happens every message.
  if(Math.abs(1 - audit.likelihood) < 0.015) {
    util.playGame(client);
  }
  roll ? messagesSince = 0 : messagesSince++;

  if ((isHonk || isMentioned || roll || hasTriggerWord(content)) && !author.bot && !ignoredChannels.includes(channel.name)) {
    const member = await guild.members.fetch(author).catch(console.warn);
    const hasRole = member.roles.cache.find(r => r.name == 'Bot Abuser');
    if (!hasRole) {
      channel.sendTyping().catch(console.warn);
      if (isMentioned) {
        message.content = content.replace(client.user.toString(), '').trim();
      }
      audit.sentOn = message.url;
      let action = act;
      // Roll for critical
      const critRoll = chance.bool({likelihood: 2 * thursdayMultiplier});

      if (critRoll) {
        console.log('Critical roll!');
        action = rareAct;
      }

      await channel.messages.fetch({ limit: 5 }).catch(console.error);

      action(honkChannel, message).catch(e=>console.error('Failed sending Markov', e));
    }
  } else if(client.user.id !== message.author.id && !ignoredChannels.includes(channel.name)) {
    const lastTenMessages = message.channel.messages.cache.last(10).map(message=> {
      return {
        content: message.stickers.size > 0 ? message.stickers.firstKey() : message.content,
        author: message.author
      };
    }).reverse().slice(0,10);
    const microTrend = lastTenMessages.reduce((accumulate, currentVal) => {
      if((currentVal.content === message.content
        || currentVal.content === message.stickers.firstKey()) 
        && currentVal.author.id !== message.author.id) {
        return accumulate += 1;
      } else if (accumulate == 3) {
        return accumulate;
      } else {
        return accumulate = 0;
      }
    }, 0);
  
    if(microTrend > 2 && microTrend >= 4 + util.wobble(wobble)) {
      console.debug('<MICRO TREND>');
      micoTrendAct(channel, message);
    }
  } else {
    if(deadChatIntervals[guild]) clearInterval(deadChatIntervals[guild]);
    deadChatIntervals[guild] = setInterval((message, client) => {
      exports.run(message, client).catch(console.error);
    }, noiseFrequency, message, client);
  }

  guildBrains[guild.id].addMessage(message);
};

const insultAction = new Action('Insult', async () => {
  const thenable = {
    then(resolve) {
      insult.getInsult(resolve);
    },
  };
  return await thenable();
}, 1);
const coreThoughtAction = new Action('Core Thought', () => {
  const ct = coreThoughts.raw || [];
  return chance.pickone(ct);
}, 2);
const reactAction = new Action('React', (message) => {
  message.react(message.guild.emojis.cache.random().id).catch(console.error);
}, 100);
const guildCorpusAction = new Action('Guild Corpus', ({
  content = 'The goose is loose!',
  channel
}) => {
  const timeoutPromise = new Promise((resolve) => {
    setTimeout(() => {
      console.warn('[Chatter]::TIMEOUT', 'Picking random emoji...');
      resolve({
        refs: [],
        string: channel.guild.emojis.cache.random()?.toString(),
      });
    }, 90000);
  });
  const contextMessages = channel.messages.cache.last(5);
  const input = contextMessages ? contextMessages.join('\n') : content; 
  const { retries } = settings.settings.chatter;
  const options = {
    input,
    retries: Math.round(Math.min(retries, Math.max(2, guildBrains[channel.guildId].corpus.chain.size / 10000 || 0))),
    filter: Brain.generateFilter(input, channel)
  };


  return Promise.any([
    guildBrains[channel.guildId].createSentence(options),
    timeoutPromise,
  ]).catch(rejection => console.warn('[Chatter]', rejection));
}, 100);
const wikiCorpusAction = new Action('Wiki Corpus', async ({
  content,
}) => {

  const options = {
    input: content,
    ...wikiRead.defaultWikiGenerateOptions,
  };

  content ? await wikiRead.addSearchedWiki(content).catch(console.error) : wikiRead.addRandomWiki().catch(console.error);
  return await wikiRead.generateWikiSentence(options).catch(console.error);
}, 25);
const sampleCorpusAction = new Action('Sample Corpus', async ({
  content,
}) => {

  const options = {
    input: content,
    ...sampleChain.sampleGenOptions,
  };

  return await sampleChain.generateSentence(options).catch(console.error);
}, 25);
const guildEmojiAction = new Action('Guild Emoji', async ({ channel }) => {
  const { emojis } = channel.guild;
  if(!emojis.chache) {
    const fetchedEmojis = await emojis.fetch().catch(console.error);
    return { string: fetchedEmojis.random().toString() };
  } else {
    return { string: channel.guild.emojis.chache.random().toString() };
  }
}, 25);
const guildStickerAction = new Action('Guild Sticker', async ({ channel }) => {
  const { stickers } = channel.guild;
  if(!stickers.cache) {
    const fetchedStickers = await stickers.fetch().catch(console.error);
    return { string:'', refs: [{sticker: [fetchedStickers.random()]}]};
  } else {
    return { string:'', refs: [{sticker: [channel.guild.stickers.cache.random()]}]};
  }
}, 25);
const coreAction = new Action('Core', () => {
  return { string: chance.pickone(coreThoughts.raw) };
}, 1);

const Builtin = {
  ACTIONS: [
    guildCorpusAction,
    wikiCorpusAction,
    sampleCorpusAction,
    guildEmojiAction,
    guildStickerAction,
    coreThoughtAction,
    insultAction,
    reactAction,
    coreAction
  ]
};

const hasTriggerWord = (m) => {
  const { triggerWords } = settings.settings.chatter;
  return !(triggerWords.findIndex(tw => m.toLowerCase().includes(tw)) < 0);
};

const rareAct = (channel, message) => {
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
      weight: 2,
      task: () => {
        console.debug('<CORE THOUGHT>');
        const ct = coreThoughts.raw || [];
        sendChatter(channel, chance.pickone(ct));
      }
    },
    {
      name: 'react',
      weight: 100,
      task: () => {
        console.debug('<REACT>');
        message.react(message.guild.emojis.cache.random().id).catch(console.error);
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

const act = async (channel, message) => {
  const contentSize = guildBrains[channel.guildId].corpus.chain.size;
  console.log('[Generating String]', contentSize);
  channel.sendTyping().catch(console.error);

  const config = settings.settings.chatter;
  const { guildId } = channel;
  const {disableImage = false, mentions = true, weights = [100, 25, 25, 25, 10, 25, 1] } = config;


  const taskWeights = [];
  const tasks = [];

  Builtin.ACTIONS.forEach((actionable, index) => {
    if(weights[index] !== undefined){
      actionable.weight = weights[index];
    }
    taskWeights.push(actionable.weight);
    tasks.push(actionable);
  });
  
  const picked = chance.weighted(tasks, taskWeights);
  audit.source = picked.name;
  const actionResult = await picked.act(message).catch((error) => {
    console.error(error);
    return {
      string: guildBrains[guildId].getRandomWord(),
      refs: []
    };
  });
  
  if(!actionResult) {
    return;
  }

  const { string = guildBrains[guildId].getRandomWord(), refs = ['<action did not return references>'] } = actionResult;
  let files = [];
  const { stickers, attachments } = refs.reduce((accumulator, current) => {
    if (!disableImage) {
      accumulator.attachments = current.attachments && chance.bool() ? accumulator.attachments.concat([...current.attachments.values()]) : accumulator.attachments;
    }
    accumulator.stickers = current.sticker ? accumulator.stickers.concat(current.sticker) : accumulator.stickers;
    return accumulator;

  }, {attachments: [], stickers: []});

  audit.refs = [...new Set(refs.flatMap(({guild, channel, id, string, source}) => {
    if(guild && channel && id) {
      return ` https://discord.com/channels/${guild}/${channel}/${id} `;
    } else if(source) {
      return ` ${source} `;
    } else {
      return ` ${string} `;
    }
  }))];
  
  files = chance.bool() && attachments.length > 0 ? [new AttachmentBuilder(chance.pickone(attachments).attachment)] : [];

  return sendChatter(channel,
    string,
    {
      files,
      stickers: chance.bool() && stickers.length > 0 ? [chance.pickone(stickers)] : [],
      allowedMentions: {
        parse: mentions ? [AllowedMentionsTypes.Everyone, AllowedMentionsTypes.Role, AllowedMentionsTypes.User] : []
      }
    });

};

const micoTrendAct = (channel, message) => {
  return sendChatter(channel, message.content);
};

const sendChatter = (channel, content, options) => {
  channel.sendTyping().catch(console.error);
  const a = audit;
  const payload = MessagePayload.create(channel,{content, ...options});
  channel.send(payload).then((sentMessage) => {
    options = {
      ...options,
      allowedMentions: !settings.settings.chatter.mentions ? [] : [AllowedMentionsTypes.Everyone, AllowedMentionsTypes.Role, AllowedMentionsTypes.User],
      tts: chance.bool({likelihood: 1}),
    };
    if(chance.bool({likelihood: 1})) {
      sentMessage.edit(zalgo.default(sentMessage.content)).catch(console.error);
    }
    a.timestamp = Date.now();
    auditHistory[sentMessage.id] = a;
  }).catch(console.error);
};

settings.loadConfig();
