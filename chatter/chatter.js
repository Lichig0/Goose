const Discord = require('discord.js');
const fs = require('fs');
const mathjs = require('mathjs');
const Markov = require('markov-strings').default;
const settings = require('../settings');
const coreThoughts = require('./coreThoughts');
const insult = require('../commands/insult');
const Chance = require('chance');

const urlRegex = new RegExp(/[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)?/gi);
const userIDRegex = new RegExp(/\<\@([0-9]{18})\>/);
const data = coreThoughts.coreThoughts(ct => markov.addData(Object.values(ct)));

const chance = new Chance();
let messagesSince = 0;
let mostRecent, makeNoise, noiseTimeout;
let markov = new Markov({ stateSize: 2 });
const auditHistory = {}
let audit = {
  timestamp: Date.now()
};

const sendChatter = (channel, text, options) => {
  const a = audit;
  channel.send(text, options).then((sentMessage) => {
    a.timestamp = Date.now()
    auditHistory[sentMessage.id] = a;
  }).catch(console.error);
}

module.exports.audit = (params) => {
  if (auditHistory[params] !== undefined) {
    return auditHistory[params]
  }
  return audit;
}

module.exports.init = (client) => {
  const config = settings.settings.chatter;
  const disabled = config.disabledChannels || [];
  client.guilds.cache.each(guild => {
    const channelsToScrape = guild.channels.cache.filter(ch => ch.type == 'text' && ch.viewable && !ch.nsfw && !disabled.includes(ch.name));
    scrapeHistory(guild, channelsToScrape);
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
  // const randRoll = Math.random(); console.log(randRoll);
  const nuRandRoll = chance.bool({ likelihood: (config.randomChat)}); console.log(nuRandRoll, `${messagesSince/(config.randomChat*100)}`, channel.name, author.tag);
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
      console.log('[Make Noise]', mostRecent.channel.name);
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
        return {likelihood: 100, string: 'Fucking leave then.'}
      }
    }
  }

  
  if ((isHonk || isMentioned || nuRandRoll || hasTriggerWord(content)) && !author.bot && !ignored.includes(channel.name)) {
    guild.members.fetch(author).then(m => {
      const hasRole = m.roles.cache.find(r => r.name == 'Bot Abuser');
      if (!hasRole) {
        audit.sentOn = content;
        const easterEgg = searchForEggs(message);
        if(easterEgg) {
          // Roll for rotten egg
          const rottenRoll = chance.bool({likelihood: easterEgg().likelihood});
          // if (rottenRoll) return honkChannel.send(easterEgg().string).then(() => audit.timestamp = Date.now()).catch(console.error);
          if (rottenRoll) return sendChatter(honkChannel, easterEgg().string);
        }
        // Roll for critical
        const critRoll = chance.bool({likelihood: 1.2});
        if (critRoll) console.log('Critical roll!');
        // critRoll ? sendSourString(honkChannel, message, client) : sendMarkovString(honkChannel, data, content);
        critRoll ? sendSourString(honkChannel, message, client) : sendMarkovString(honkChannel, data, content);
      }
    });
  }
};

const sendSourString = (channel, message, client) => {
  const sourString = [
    {
      name: 'insult',
      weight: 1,
      task: () => {
        insult.run(message, client);
      }
    },
    {
      name: 'coreThought',
      weight: 1.2,
      task: () => {
        const ct = coreThoughts.raw || [];
        // channel.send(chance.pickone(ct));
        sendChatter(chance.pickone(ct));
        audit.timestamp = Date.now();
      }
    },
    {
      name: 'react',
      weight: 4,
      task: () => {
        message.react(client.emojis.cache.random().id).catch(console.error);
      }
    }
  ]
  const ws = [];
  const tsks = [];
  sourString.forEach((v) => {
    ws.push(v.weight);
    tsks.push(v.task);
  })
  chance.weighted(tsks, ws)();
};

const saveData = () => {
  const save = {};
  save.data = data;
  save.corpus = markov.export();
  fs.writeFile('cache.json', JSON.stringify(save), function (err) {
    if (err) return console.log(err);
  });
};

const loadData = async (client) => {
  client.user.setStatus('dnd');
  fs.readFile('cache.json', 'utf8', function (err, d) {
    if (err) {
      client.user.setStatus('online');
      return console.log(err);
    }
    const save = JSON.parse(d);
    Object.assign(data, save.data);
    markov.import(save.corpus);
    client.user.setStatus('online');
  });
};

const generateAsync = async (options = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const result = markov.generate(options);
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
    sendChatter(channel, chatter, { files }).catch(console.warn);
    // channel.send(chatter, { files }).catch(console.warn);
    audit.timestamp = Date.now();
  });
  
  const contextScore = (markovString) => {
    let score = 0;
    // console.log(content, markovString);
    const words = markovString.split(/[ ,.!?;()"/]/);
    words.forEach(word => {
      if(!word == '' && !word == ' ') {
        if(content.includes(word)) score++;
      }
    });
    score = score + (-0.03*(words.length-12)^(2)+3);
    return score;
  };
  const nsfwCheck = (refs) => {
    const safe = false;
    refs.forEach(ref => {

    })
  }
  const refsScore = (refs) => {
    let score = 0;
    const channelInfluence = config.channelInfluence || 2;
    refs.forEach(ref => {
      score += ref.channel === channel.id ? channelInfluence : -channelInfluence;
    });
    return score;
  };

  const hasPairs = (str) => {
    const needsPairs = ['"', '\'', '`'];
    let pass = true;
    needsPairs.forEach(char => {
      if (str.split(char).length % 2 !== 1) {
        pass = false;
        return pass;
      }
    });
    return pass;
  };

  const minimumScore = config.minimumScore || 2;
  const maxTries = config.maxTries || 30;
  const options = {
    maxTries, // Give up if I don't have a sentence after 20 tries (default is 10)
    prng: Math.random, // An external Pseudo Random Number Generator if you want to get seeded results
    filter: (result) => {
      return (contextScore(result.string) + result.score + refsScore(result.refs)) >= minimumScore && hasPairs(result.string) && (channel.nsfw === result.refs.reduce((a,b) => a || b.nsfw).nsfw  );
    }
  };
  // await markov.buildCorpusAsync()
  // Generate a sentence
  generateAsync(options).then((result) => {
    const config = settings.settings.chatter;
    chatter = result.string;
    let attachments = [];
    if (!config.disableImage) result.refs.forEach(ref => attachments = attachments.concat(ref.attachments.array()));
    audit.refs = result.refs.flatMap(r => r.string);
    files = attachments.length > 0 ? [mathjs.pickRandom(attachments)] : [];
    channel.stopTyping(true);
  }).catch(() => {
    console.log('[Couldn\'t generate context sentence]');
    chatter = client.emojis.cache.random().id;
    audit.refs = 'Skipped';
    channel.stopTyping(true);
  });
};

const addMessage = (message, splitRegex = undefined) => {
  const { id, guild, content, channel, attachments } = message;
  const config = settings.settings.chatter;
  const preFormat = config.preFormat || false;
  const splitter = splitRegex instanceof RegExp ? splitRegex : new RegExp(config.messageSplitter);
  
  const subMessage = content.match(urlRegex) ? [content] : content.split(splitter);
  const cache = { string: content, id, guild: guild.id, channel: channel.id, attachments: attachments, nsfw: channel.nsfw };
  subMessage.forEach((str, i) => {
    const trimmedString = str.trim();
    if (trimmedString !== '') { //skip empty strings
      cache.string = preFormat ? `${trimmedString.replace(trimmedString[0], trimmedString[0].toUpperCase())}.` : trimmedString; // Experimental
      if (data[`${id}.${i}`] !== undefined) {
        return;
      } else {
        data[`${id}.${i}`] = cache;
        markov.addData([cache]);
      }
    } else if (cache.attachments.size > 0 && data[`${id}.${0}`] === undefined) {
      data[`${id}.${i}`] = { 
        ...cache,
        trimmedString: `la li lu le lo`
      };
      markov.addData([{ ...cache, string: `la li lu le lo` }]);
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
  if (Object.values(data).length < config.arrayLimiter && times < 500 && toCache.length > 0) {
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
  console.log(`[Scraping History]: ${guild.name}`);

  const last = {};
  textChannels.forEach(tc=> last[tc.id] = {});
  // last[message.channel.id] = message;
  buildData(last, textChannels, data, r).then(() => {
    client.user.setStatus('online');
    console.log('[Ready!]');
  }).catch((err) => {
    console.error(err);
    if (readRetry < 3) {
      readRetry++;
      scrapeHistory(guild, textChannels, readRetry);
    }
  }).finally(() => {
    client.user.setStatus('online');
    client.user.setActivity('👀', { type: 'WATCHING' });
    console.log('[Done.]:', guild.name , Object.values(data).length);
  });
};

settings.loadConfig();

exports.saveData = saveData;
exports.loadData = loadData;
exports.buildData = scrapeHistory;

