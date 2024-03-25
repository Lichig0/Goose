const { ChannelType, AllowedMentionsTypes, MessagePayload } = require('discord.js');
const settings = require('../settings');
const util = require('./util');
const coreThoughts = require('./coreThoughts');
const insult = require('../commands/insult');
const game = require('../commands/game');
const Chance = require('chance');
const wikiRead = require('./wikireader');
const { Brain } = require('./brain');
const zalgo = require('zalgo-js');
const Action = require('./Action').default;

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
    console.log('[Finished creating models.]', done.length);
    console.log('[Finished scraping.]', done.map(guildData => guildData.length));
    Object.values(guildBrains).map(gb=>gb.clearGuildCache());
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
  if(!message) throw('Message is required: ', message);
  const { author, channel, content, guild, mentions } = message;
  const optedOutIds = client.optedOutUsers.map(({userId}) => userId);
  audit = {};
  if(optedOutIds.includes(author.id)) return;
  const config = settings.settings.chatter;
  const { ignoredChannels = [], frequency = 60, useHonk, randomChat, wobble = 2 } = config;
  const noiseFrequency = (frequency * 60000);
  const isMentioned = mentions.has(client.user.id);
  const honkChannel = (isMentioned && useHonk) ? theHonk : channel;
  const isHonk = channel.name === 'honk';
  const theHonk = guild.channels.cache.find(ch => ch.name.includes('honk')) || channel;
  const thursdayMultiplier = new Date().getDay() === 4 ? 1.5 : 1;
  const chatFrequency = randomChat * thursdayMultiplier;
  const roll = chance.bool({ likelihood: (chatFrequency)}); console.log('[Chatter]', roll, `${(messagesSince/(chatFrequency*100)).toFixed(3)}`, guild.name, channel.name, author.tag);
  audit.likelihood = messagesSince/(chatFrequency*100);

  // TODO: move this into it's own file; loaded in as something that happens every message.
  if(Math.abs(1 - audit.likelihood) < 0.015) {
    const playGame = chance.bool({likelihoood: 0.4});
    if (playGame) {
      game.getGame(undefined, (game) => {
        client.user.setActivity(`🎮 ${game.name}`);
      });
    } else {
      client.user.setActivity('👀', { type: 'WATCHING' });
    }
  }
  roll ? messagesSince = 0 : messagesSince++;

  if(deadChatIntervals[guild]) clearInterval(deadChatIntervals[guild]);
  deadChatIntervals[guild] = setInterval((message, client) => {
    exports.run(message, client).catch(console.error);
  }, noiseFrequency, message, client);

  guildBrains[guild.id].addMessage(message);

  if ((isHonk || isMentioned || roll || hasTriggerWord(content)) && !author.bot && !ignoredChannels.includes(channel.name)) {
    const member = await guild.members.fetch(author).catch(console.warn);
    const hasRole = member.roles.cache.find(r => r.name == 'Bot Abuser');
    if (!hasRole) {
      await channel.sendTyping();
      audit.sentOn = content;
      // Roll for critical
      const critRoll = chance.bool({likelihood: 2 * thursdayMultiplier});

      if (critRoll) console.log('Critical roll!');

      critRoll ? rareAct(honkChannel, message) : act(honkChannel, message).catch(e=>console.error('Failed sending Markov', e));
    }
  } else if(client.user.id !== message.author.id && !ignoredChannels.includes(channel.name)) {
    const lastTenMessages = message.channel.messages.cache.last(10).map(message=> {
      return {
        content: message.sticker.size > 0 ? message.stickers.firstKey() : message.content,
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
  
    if(microTrend > 2 && microTrend >= (4 + util.wobble(wobble))) {
      console.debug('<MICRO TREND>');
      await channel.send(message).catch(console.warn);
    }
  }

};

const insultAction = new Action('Insult', 1, async () => {
  const thenable = {
    then(resolve) {
      insult.getInsult(resolve);
    },
  };
  return await thenable();
});
const coreThoughtAction = new Action('Core Thought', 2, () => {
  const ct = coreThoughts.raw || [];
  return chance.pickone(ct);
});
const reactAction = new Action('React', 100, (message) => {
  message.react(message.guild.emojis.cache.random().id).catch(console.error);
});

const guildCorpusAction = new Action('Guild Corpus', 100, ({
  content,
  channel
}) => {
  const timeoutPromise = new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        refs: ['None'],
        text: 'I made a mess of my nest.',
        string: channel.guild.emojis.cache.random()?.toString(),
      });
    }, 90000);
  });

  const input = content?.split ? chance.pickone(content.split(' ')) : undefined; 
  const { retries } = settings.settings.chatter;
  const options = {
    input,
    retries,
    filter: Brain.generateFilter(content, channel)
  };


  return Promise.race([
    guildBrains[channel.guildId].createSentence(options),
    guildBrains[channel.guildId].createSentence({...options, input: undefined}),
    timeoutPromise,
  ]);
});
const wikiCorpusAction = new Action('Wiki Corpus', 25, async ({
  content,
}) => {

  const input = content?.split ? chance.pickone(content?.split(' ')) : undefined;
  const options = {
    input,
    ...wikiRead.defaultWikiGenerateOptions,
  };

  input ? await wikiRead.addSearchedWiki(input).catch(console.error) : wikiRead.addRandomWiki().catch(console.error);
  return await wikiRead.generateWikiSentence(options).catch(console.error);
});
const guildEmojiAction = new Action('Guild Emoji', 25, ({ channel }) => {
  const { emojis } = channel.guild;
  if(!emojis.chache) {
    emojis.fetch().then(fetchedEmojis => {
      return { string: fetchedEmojis.random().toString() };
    }).catch(console.error);
  } else {
    return { string: channel.guild.emojis.chache.random().toString() };
  }
});
const guildStickerAction = new Action('Guild Sticker', 25, ({ channel }) => {
  const { stickers } = channel.guild;
  if(!stickers.cache) {
    stickers.fetch().then(fetchedStickers => {
      return { string: fetchedStickers.random().toString() };
    }).catch(console.error);
  } else {
    return { string:'', refs: [{sticker: [channel.guild.stickers.chache.random()]}]};
  }
});
const coreAction = new Action('Core', 1, () => {
  return { string: chance.pickone(coreThoughts.raw) };
});


const Builtin = {
  ACTIONS: [
    guildCorpusAction,
    wikiCorpusAction,
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

  const config = settings.settings.chatter;
  const { guildId } = channel;
  const {disableImage = false, mentions = true, weights = [100, 25, 25, 1] } = config;


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

  const { string = guildBrains[guildId].getRandomWord(), refs = [] } = actionResult;
  let files = [];
  const { stickers, attachments } = refs.reduce((accumulator, current) => {
    if (!disableImage) {
      accumulator.attachments = current.attachments ? accumulator.attachments.concat(current.attachments) : accumulator.attachments;
    }
    accumulator.stickers = current.sticker ?  accumulator.stickers.concat(current.sticker) : accumulator.stickers;
    return accumulator;

  }, {attachments: [], stickers: []});
  audit.refs = refs.flatMap(r => r.string);
  files = attachments.size > 0 ? [attachments.random()] : [];

  return sendChatter(channel,
    string,
    {
      embeds: files,
      stickers: chance.bool({likelihood: (stickers.length / 10)}) ? [chance.pickone(stickers)] : [],
      allowedMentions: {
        parse: mentions ? [AllowedMentionsTypes.Everyone, AllowedMentionsTypes.Role, AllowedMentionsTypes.User] : []
      }
    });

};

const sendChatter = (channel, content, options) => {
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
