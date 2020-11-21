const Markov = require('markov-strings').default;
const fs = require('fs');
const settings = require('../settings');
const Discord = require('discord.js');
const coreThoughts = require('./coreThoughts');
const insult = require('../commands/insult');
const urlRegex = new RegExp(/[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)?/gi);
const data = coreThoughts.coreThoughts(ct => markov.addData(Object.values(ct)));
let mostRecent, makeNoise, noiseTimeout;
let markov = new Markov({ stateSize: 2 });

let reload = true;
let readRetry = 0;

// TODO : turn this into a class?
module.exports.run = (message = mostRecent, client) => {
  const config = settings.settings.chatter;
  const { author, channel, content, guild, mentions } = message;
  const triggerWords = config.triggerWords || [];
  const isMentioned = mentions.has(client.user.id);
  const isHonk = channel.name === 'honk';
  const theHonk = guild.channels.cache.find(ch => ch.name === 'honk') || channel;
  const rand = Math.random(); console.log(rand);
  const honkChannel = (isMentioned && config.useHonk) ? theHonk : channel;
  const disabled = config.disabledChannels || [];
  const ignored = config.ignoredChannels || [];
  const noiseFrequency = (config.frequency * 60000) || 60 * 60000;

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

  if (reload === true) {
    const textChannels = guild.channels.cache.filter(ch => ch.type == 'text' && ch.viewable && !ch.nsfw && !disabled.includes(ch.name));
    readMessages(message, textChannels);
    reload = false;
  }
  if ((isHonk || isMentioned || rand > config.randomChat || hasTriggerWord(content)) && !author.bot && !ignored.includes(channel.name)) {
    guild.members.fetch(author).then(m => {
      const hasRole = m.roles.cache.find(r => r.name == 'Bot Abuser');
      if (!hasRole) sendMarkovString(honkChannel, data, content);
    });
  } else if (rand >= 0.666 && rand <= 0.667) {
    // run insult
    console.log('CRITICAL ROLL')
    insult.run(message, client);
  } else if (rand >= 0.69 && rand < 0.691) {
    const ct = coreThoughts.raw || [];
    console.log('crit');
   // message.channel.send(ct[Math.floor(Math.random() * ct.length)]);
  } 
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
    channel.send(chatter, { files }).catch(console.warn);
  });
  const contextScore = (markovString) => {
    let score = 0;
    // console.log(content, markovString);
    markovString.split(/[ ,.!?;()"/]/).forEach(word => {
      if(!word == '' && !word == ' ') {
        if(content.includes(word)) score++;
      }
    });
    return score;
  };
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
      return (contextScore(result.string) + result.score + refsScore(result.refs)) >= minimumScore && hasPairs(result.string);
    }
  };
  // await markov.buildCorpusAsync()
  // Generate a sentence
  generateAsync(options).then((result) => {
    const config = settings.settings.chatter;
    chatter = result.string;
    let attachments = [];
    if (!config.disableImage) result.refs.forEach(ref => attachments = attachments.concat(ref.attachments.array()));
    files = attachments.length > 0 ? [attachments[Math.floor(Math.random() * attachments.length)]] : [];
    channel.stopTyping(true);
  }).catch(() => {
    console.log('[Couldn\'t generate context sentence]');
    options.filter = (result) => result.score >= 2;
    generateAsync(options).then(result => {
      chatter = result.string;
      if (!config.disableImage) result.refs.forEach(ref => files = files.concat(ref.attachments.array()));
      channel.stopTyping(true);
    }).catch(console.warn).finally(()=>channel.stopTyping(true));
  });
};

const addMessage = (m, splitRegex = undefined) => {
  const config = settings.settings.chatter;
  const preFormat = config.preFormat || false;
  const splitter = splitRegex instanceof RegExp ? splitRegex : new RegExp(config.messageSplitter);
  const multi = m.content.match(urlRegex) ? [m.content] : m.content.split(splitter);
  const cache = { string: m.content, id: m.id, guild: m.guild.id, channel: m.channel.id, attachments: m.attachments };
  multi.forEach((str, i) => {
    const trimmedString = str.trim();
    if (trimmedString !== '') { //skip empty strings
      cache.string = preFormat ? `${trimmedString.replace(trimmedString[0], trimmedString[0].toUpperCase())}.` : trimmedString; // Experimental
      if (data[`${m.id}.${i}`] !== undefined) {
        return;
      } else {
        data[`${m.id}.${i}`] = cache;
        markov.addData([cache]);
      }
    } else if (cache.attachments.size > 0 && data[`${m.id}.${0}`] === undefined) {
      data[`${m.id}.${i}`] = { ...cache, trimmedStringing: `the ${cache.attachments.first().name}` };
      markov.addData([{ ...cache, string: `the ${cache.attachments.first().name}` }]);
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

const readMessages = async (message, textChannels) => {
  const {client} = message;
  let r = 0;

  await client.user.setStatus('dnd');
  await client.user.setActivity('📖🔍🤔', { type: 'WATCHING' });
  console.log('[Reading messages]');
  const last = {};
  textChannels.forEach(tc=> last[tc.id] = {});
  last[message.channel.id] = message;
  buildData(last, textChannels, data, r).then(() => {
    client.user.setStatus('online');
    console.log('[Ready!]');
  }).catch((err) => {
    console.error(err);
    if (readRetry < 3) {
      readRetry++;
      readMessages(message, textChannels);
    }
  }).finally(() => {
    client.user.setStatus('online');
    client.user.setActivity('👀', { type: 'WATCHING' });
    console.log('[Done.]:', Object.values(data).length);
  });
};

settings.loadConfig();

exports.saveData = saveData;
exports.loadData = loadData;
exports.buildData = readMessages;

