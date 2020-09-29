const Markov = require('markov-strings').default;
const fs = require('fs');
const settings = require('../settings');
const Discord = require('discord.js');
const urlRegex = new RegExp(/[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)?/gi);
const data = {0:{ string: 'honk' }};
let mostRecent, makeNoise;
let markov = new Markov({ stateSize: 2 });

let reload = true;

// TODO : turn this into a class?
module.exports.run = (message, client) => {
  const config = settings.settings.chatter;
  const { author, channel, content, guild, mentions } = message;
  const isMentioned = mentions.has(client.user.id);
  const isHonk = channel.name === 'honk';
  const theHonk = guild.channels.cache.find(ch => ch.name === 'honk') || channel;
  const rand = Math.random(); console.log(rand);
  const honkChannel = (isMentioned && config.useHonk) ? theHonk : channel;
  const disabled = config.disabledChannels || [];

  //guild.channels.create('honk',{type: 'text', topic: 'honk', rateLimitPerUser: 1, reason: 'Channel for bot use without spamming other channels'});
  addMessage(message);
  mostRecent = message;
  if(makeNoise) {
    makeNoise.refresh();
  } else {
    // makeNoise = client.setTimeout(sendMarkovString, (config.frequency * 60000) || 60 * 60000, honkChannel, data, mostRecent.content);
    makeNoise = client.setTimeout(exports.run, (config.frequency * 60000) || 60 * 60000, mostRecent, client);
  }
  if (reload === true) {
    if (data.length == 1) delete data['0']; // delete init data

    const textChannels = guild.channels.cache.filter(ch => ch.type == 'text' && ch.viewable && !ch.nsfw && !disabled.includes(ch.name));
    readMessages(message, textChannels);
    reload = false;
    return;
  } else if ((isHonk || isMentioned || rand > config.randomChat) && !author.bot) {
    guild.members.fetch(author).then(m => {
      const hasRole = m.roles.cache.find(r => r.name == 'Bot Abuser');
      if (!hasRole) sendMarkovString(honkChannel, data, content);
    });
  }
};


const saveData = () => {
  fs.writeFile('cache.json', JSON.stringify(data), function (err) {
    if (err) return console.log(err);
  });
};

const loadData = (client) => {
  client.user.setStatus('dnd');
  fs.readFile('cache.json', 'utf8', function (err, data) {
    if (err) {
      return console.log(err);
    }
    data = JSON.parse(data);
    markov = new Markov(Object.values(data).flat(2), { stateSize: 2 });
    markov.buildCorpusAsync().then(() => {
      client.user.setStatus('online');
    }).catch((err) => {
      console.error(err);
      client.user.setStatus('idle');
    });
    console.log('okay', data.length);
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
  let chatter = '🤫';
  let files = [];
  channel.startTyping().then(() => {
    channel.send(chatter, { files }).catch(console.warn);
  });
  const config = settings.settings.chatter;
  console.log('okay', Object.values(data).length);
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
  const minimumScore = config.minimumScore || 2;
  const maxTries = config.maxTries || 30;
  const options = {
    maxTries, // Give up if I don't have a sentence after 20 tries (default is 10)
    prng: Math.random, // An external Pseudo Random Number Generator if you want to get seeded results
    filter: (result) => {
      return (contextScore(result.string) + result.score) >= minimumScore;
    }
  };
  // await markov.buildCorpusAsync()
  // Generate a sentence
  generateAsync(options).then((result) => {
    const config = settings.settings.chatter;
    chatter = result.string;
    let attachments = [];
    if (!config.disableImage) result.refs.forEach(ref => attachments = attachments.concat(ref.attachments.array()));
    if(!config.mentions) chatter = Discord.Util.removeMentions(chatter);
    files = attachments.length > 0 ? [attachments[Math.floor(Math.random() * attachments.length)]] : [];
    channel.stopTyping(true);
  }).catch(() => {
    console.log('[Couldn\'t generate context sentence]');
    options.filter = (result) => result.score >= 2;
    generateAsync(options).then(result => {
      chatter = result.string;
      if (!config.disableImage) result.refs.forEach(ref => files = files.concat(ref.attachments.array()));
      if (!config.mentions) chatter = Discord.Util.removeMentions(chatter);
      channel.stopTyping(true);
    }).catch(console.warn).finally(()=>channel.stopTyping(true));
  });
};

const addMessage = (m, splitRegex = undefined) => {
  const config = settings.settings.chatter;
  const splitter = splitRegex instanceof RegExp ? splitRegex : new RegExp(config.messageSplitter);
  const multi = m.content.match(urlRegex) ? [m.content] : m.content.split(splitter);
  const cache = { string: m.content, id: m.id, guild: m.guild.id, channel: m.channel.id, attachments: m.attachments };
  multi.forEach((str, i) => {
    if ((str !== '' && str !== ' ')) { //skip empty strings
      cache.string = str;
      if (data[`${m.id}.${i}`] !== undefined) {
        return;
      } else {
        data[`${m.id}.${i}`] = cache;
        markov.addData([cache]);
      }
    } else if (cache.attachments.size > 0 && data[`${m.id}.${0}`] === undefined) {
      data[`${m.id}.${i}`] = { ...cache, string: `the ${cache.attachments.first().name}` };
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
  }).finally(() => {
    client.user.setStatus('online');
    client.user.setActivity('🦆', { type: 'WATCHING' });
    console.log('[Done.]:', Object.values(data).length);
  });
};

settings.loadConfig();

exports.saveData = saveData;
exports.loadData = loadData;
exports.buildData = readMessages;

