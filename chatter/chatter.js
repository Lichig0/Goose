const Discord = require('discord.js');
const mathjs = require('mathjs');
const Markov = require('markov-strings').default;
const settings = require('../settings');
const coreThoughts = require('./coreThoughts');
const insult = require('../commands/insult');
const game = require('../commands/game');
const Chance = require('chance');
const eyes = require('./birdEyes');
const chatterUtil = require('./util');

const urlRegex = new RegExp(/[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)?/gi);
const userIDRegex = new RegExp(/^\s?(<@){1}([0-9]{18})>/i);
const brokenUserIDRegex = new RegExp(/^\s?(<@){0}([0-9]{18})>/i);
const data = coreThoughts.coreThoughts(ct => markov.addData(Object.values(ct)));
const mimickData = {};
let userToMimick = false;

const chance = new Chance();
let messagesSince = 0;
let mostRecent, makeNoise, noiseTimeout;
let markov = new Markov({ stateSize: 2 });
const auditHistory = {};
let audit = {
  timestamp: Date.now()
};

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
  const tasks = [];

  client.guilds.cache.each(guild => {
    const channelsToScrape = guild.channels.cache.filter(ch => ch.type == 'text' && ch.viewable && !ch.nsfw && !disabled.includes(ch.name));

    tasks.push(scrapeHistory(guild, channelsToScrape));
  });
  await Promise.all(tasks);
  client.user.setStatus('online');
  client.user.setActivity('👀', { type: 'WATCHING' });
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
  const nuRandRoll = chance.bool({ likelihood: (config.randomChat)}); console.log(nuRandRoll, `${messagesSince/(config.randomChat*100)}`, channel.name, author.tag);
  audit.likelihood = messagesSince/(config.randomChat*100);

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
  nuRandRoll ? messagesSince = 0 : messagesSince++;

  if(makeNoise) {
    if (noiseTimeout !== noiseFrequency) {
      makeNoise.close();
      makeNoise = undefined;
    } else {
      makeNoise.refresh();
    }
  } else {
    noiseTimeout = noiseFrequency;
    makeNoise = client.setTimeout(() => {

      console.log('[Silence Breaker]', mostRecent.channel.name);

      exports.run(mostRecent, client);
    }, noiseTimeout);
  }
  addMessage(message);
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
    } else if(content.startsWith(`${client.user}, mimick `)) {
      userToMimick = content.split('mimick ')[0];
    }
  };


  if ((isHonk || isMentioned || nuRandRoll || hasTriggerWord(content)) && !author.bot && !ignored.includes(channel.name)) {
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

        critRoll ? sendSourString(honkChannel, message, client) : sendMarkovString(honkChannel, data, content);
      }
    });
  }

  const chanCache = message.channel.messages.cache.array().reverse().slice(0,10);
  const microTrend = chanCache.reduce((accumulate, currentVal) => {
    if(currentVal.content === message.content && currentVal.author !== message.author) {
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

const generateSentence = async (options = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const result = markov.generate(options);
      resolve(result);
    } catch (e) {
      reject(e);
    }
  });
};

const generateMimickSentence = async (options = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const userMimick = mimickData[userToMimick] ? userToMimick : chance.pickone(Object.keys(mimickData));
      console.debug('MIMICK', userMimick);
      const result = mimickData[userMimick].generate(options);
      resolve(result);
    } catch (e) {
      reject(e);
    }
  });
};

const sendMarkovString = async (channel, data, content) => {

  console.log('okay', Object.values(data).length);

  let chatter = '🤫';
  let files = [];
  const config = settings.settings.chatter;
  channel.startTyping().then(() => {
    if (!config.mentions) chatter = Discord.Util.cleanContent(chatter, channel.lastMessage);
    sendChatter(channel, chatter, { files });
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
  const maxTries = 10;
  // const maxTries = config.maxTries || 30;
  /*
  function sampleWithPRNG<T>(array: T[], prng: () => number = Math.random): T | undefined {
    const length = array == null ? 0 : array.length
    return length ? array[Math.floor(prng() * length)] : undefined
    ////////////////////
    const arr = [sampleWithPRNG(this.startWords, prng)!]

      let score = 0

      // loop to build a complete sentence
      for (let innerTries = 0; innerTries < maxTries; innerTries++) {
        const block = arr[arr.length - 1] // last value in array
        const state = sampleWithPRNG(corpus[block.words], prng)
  }

  grab start words, return a random sorted given words location from start words, divide that by the length of start words. default to random after
  */
  const pRandomStartSelect = () => {
    const word = markov.startWords.findIndex(startWord => {
      // we should have a common string normalizer?
      const words = startWord.words.toLowerCase();
      const contentWord = chance.pickone(content.split(' ')).toLowerCase();
      return words !== '' && words.includes(contentWord);
    });
    console.debug(word, markov.startWords[word].words);

    if(word > 0){
      const notSoRandom = (word/markov.startWords.length);
      console.debug(notSoRandom);
      return notSoRandom;
    }
    const random = Math.random();
    console.debug('rand', random);
    return random;
  };
  const options = {
    maxTries, // Give up if I don't have a sentence after N tries (default is 10)
    // prng: Math.random, // An external Pseudo Random Number Generator if you want to get seeded results
    prng: pRandomStartSelect,
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

  // Generate a sentence
  const sentenceResultHandler = (result) => {
    const config = settings.settings.chatter;
    let attachments = [];
    chatter = result.string.replace(brokenUserIDRegex, '<@$2>');

    if (!config.disableImage) result.refs.forEach(ref => attachments = attachments.concat(ref.attachments.array()));
    audit.refs = result.refs.flatMap(r => r.string);
    files = attachments.length > 0 ? [mathjs.pickRandom(attachments)] : [];

    channel.stopTyping(true);
  };

  const sentenceFallbackHandler = () => {
    // if (e) console.error(e);
    console.log('[Couldn\'t generate sentence with constraints]');
    const minimumScore = config.minimumScore || 2;
    const tOpt = {
      maxTries: 10,
      filter: (r) => {
        const multiRef = r.refs.length;
        const goodLength = chatterUtil.wordScore(r.string);
        return (multiRef + goodLength) >= minimumScore;
      }
    };
    eyes.generateTweet(tOpt).then(result => {
      chatter = result.string;
      audit.refs = result.refs.flatMap(r => r.string);
      audit.source = 'Twitter';
    }).catch(() => {
      chatter = channel.client.emojis.cache.random().toString();
      audit.refs = 'Skipped. Did not meet constraints.';
    }).finally(() => {
      eyes.fetch();
      channel.stopTyping(true);
    });
  };
  if(chance.bool({likelihood:75}) || !userToMimick){
    generateSentence(options).then(sentenceResultHandler).catch(sentenceFallbackHandler);
  } else {
    const mOptions = {
      maxTries: options.maxTries * 2,
      filter: (result) => {
        const metScoreConstraints = chatterUtil.wordScore(result.string, content);
        const metPairsConstraints = chatterUtil.hasPairs(result.string);
        const hasNSFWRef = result.refs.reduce(chatterUtil.nsfwCheck , false);
        const metNSFWConstraints = hasNSFWRef.nsfw ? channel.nsfw : true;

        return metScoreConstraints && metPairsConstraints && metNSFWConstraints;
      }
    };
    generateMimickSentence(mOptions).then((result) => {
      audit.mimicking = true;
      sentenceResultHandler(result);
    }).catch(sentenceFallbackHandler);
  }
};

const addMessage = (message, splitRegex = undefined) => {
  const { id, guild, content, channel, attachments, author } = message;
  const config = settings.settings.chatter;
  const splitter = splitRegex instanceof RegExp ? splitRegex : new RegExp(config.messageSplitter);

  let resolvedUserNameContent = content.replace(brokenUserIDRegex, '<@$2>');
  if(userIDRegex.test(resolvedUserNameContent)) {
    const guildUser = guild.member(userIDRegex.exec(resolvedUserNameContent)[2]);
    if( guildUser ) {
      const username = guildUser.nickname || guildUser.user.username;
      resolvedUserNameContent = resolvedUserNameContent.replace(userIDRegex, username);
    }
  }

  const subMessage = resolvedUserNameContent.match(urlRegex) ? [resolvedUserNameContent] : resolvedUserNameContent.split(splitter);
  const cache = { string: resolvedUserNameContent, id, guild: guild.id, channel: channel.id, attachments: attachments, nsfw: channel.nsfw };
  if(mimickData[author.id] === undefined) mimickData[author.id] = new Markov({ stateSize: 2 });
  subMessage.forEach((str, i) => {
    const trimmedString = str.trim();

    if (trimmedString !== '') { //skip empty strings
      cache.string = chatterUtil.normalizeSentence(trimmedString);
      if (data[`${id}.${i}`] !== undefined) {
        return;
      } else {
        data[`${id}.${i}`] = cache;
        markov.addData([cache]);
        mimickData[author.id].addData([cache]);
      }
    } else if (cache.attachments.size > 0 && data[`${id}.${0}`] === undefined && channel.messages.cache.array()[1]) {

      const substituteString = channel.messages.cache.array()[1].content;
      let tCache = data[`${id}.${i}`] = {
        ...cache,
        trimmedString: substituteString
      };
      markov.addData([tCache]);
      mimickData[author.id].addData([tCache]);
    }
  });
  return cache;
};

const buildData = async (last = {}, channels, data, times) => {
  times++;
  const config = settings.settings.chatter;
  const tasks = channels.array().flatMap((ch) => fetchMessages(ch, last[ch.id]));
  const msgs = await Promise.all(tasks);
  const toCache = msgs instanceof Array ? msgs.filter(m => m.size > 0) : [];

  const splitter = new RegExp(config.messageSplitter);

  toCache.filter(m => m.size > 0).forEach(mm => {
    mm.forEach((m) => {
      last[m.channel.id] = addMessage(m, splitter);
    });
    if (mm.size < 100) {
      const i = msgs.indexOf(mm);
      if ( i > -1 && msgs[i].array().size > 0) channels.delete(msgs[i].array()[0].channel.id);
    }
  });
  if (Object.values(data).length < config.arrayLimiter && times < 1000 && toCache.length > 0) {
    await buildData(last, channels, data, times);
  }
};

const fetchMessages = async (channel, o) => {
  return o.channel === channel.id ? channel.messages.fetch({ limit: 100, before: o.id }) : channel.messages.fetch({ limit: 100 });
};

const scrapeHistory = async (guild, textChannels, readRetry = 0) => {
  const {client} = guild;
  let r = 0;

  await client.user.setStatus('dnd');
  await client.user.setActivity('📖🔍🤔', { type: 'WATCHING' });

  console.log(`[Scraping History]: ${guild.name} | Channels: ${textChannels.array().map(channel=>channel.name)}`);

  const last = {};
  textChannels.forEach(tc=> last[tc.id] = {});
  buildData(last, textChannels, data, r).then(() => {
  }).catch((err) => {

    console.error(err);

    if (readRetry < 3) {
      readRetry++;

      console.warn('Retry: ', readRetry);

      scrapeHistory(guild, textChannels, readRetry);
    }
  }).finally(() => {

    console.log('[Done.]:', guild.name , Object.values(data).length);

  });
};

settings.loadConfig();

exports.buildData = scrapeHistory;
