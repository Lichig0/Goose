const Markov = require('markov-strings').default;
const fs = require('fs');
const settings = require('../settings');
const Discord = require('discord.js');
const data = {0:{ string: 'honk' }};
let markov = new Markov(Object.values(data).flat(2), { stateSize: 2 });
let reload = 0;


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

  //guild.channels.create('honk',{type: 'text', topic: 'honk', rateLimitPerUser: 1, reason: 'Channel for bot use without spaming other channels'});
  if (reload <= 0) {
    if (data.length == 1) delete data['0']; // delete init data

    const textChannels = guild.channels.cache.filter(ch => ch.type == 'text' && ch.viewable && !ch.nsfw && !disabled.includes(ch.name));
    readMessages(message, textChannels);
    reload = config.reload || 500;
    return;
  } else if ((isHonk || isMentioned || rand > config.randomChat) && !author.bot) {
    guild.members.fetch(author).then(m => {
      honkChannel.startTyping();
      const hasRole = m.roles.cache.find(r => r.name == 'Bot Abuser');
      if (!hasRole) sendMarkovString(honkChannel, data, content);
    });
  }
  reload--;
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

const sendMarkovString = async (channel, data, content) => {
  channel.startTyping();
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
      return result.string.split (' ').length >= Math.pow(Math.floor(Math.random() * 3) + 1, Math.floor(Math.random() * 4 + 1)) &&
        contextScore(result.string) >= minimumScore && result.score >= minimumScore;
    }
  };
  // await markov.buildCorpusAsync()
  // Generate a sentence
  markov.generateAsync(options).then((result) => {
    const config = settings.settings.chatter;
    let chatter = result.string;
    channel.stopTyping();
    let files = [];
    result.refs.forEach(ref => files = files.concat(ref.attachments.array()));
    if(!config.mentions) chatter = Discord.Util.removeMentions(chatter);
    channel.send(chatter, {files}).catch(console.warn);
  }).catch(() => {
    console.log('[Couldn\'t generate context sentence]');
    options.filter = (result) => result.string.split(' ').length >= Math.pow(Math.floor(Math.random() * 3) + 1, Math.floor(Math.random() * 4 + 1));
    markov.generateAsync(options).then(result => {
      let chatter = result.string;
      let files = [];
      result.refs.forEach(ref => files = files.concat(ref.attachments.array()));
      if (!config.mentions) chatter = Discord.Util.removeMentions(chatter);
      channel.send(chatter, {files});
    }).catch(console.warn).finally(()=>channel.stopTyping(true));
    channel.stopTyping();
  }).finally(() => channel.stopTyping(true));
};


const buildData = async (last = {}, channels, data, times) => {
  times++;
  const config = settings.settings.chatter;
  const tasks = channels.array().flatMap((ch) => fetchMessages(ch, last[ch.id]));
  const msgs = await Promise.all(tasks);
  const toCache = msgs.filter(m => m.size > 0);

  const splitter = RegExp(config.messageSplitter);

  toCache.filter(m => m.size > 0).forEach(mm => {
    mm.forEach((m) => {
      const multi = m.content.split(splitter);
      const cache = { string: m.content, id: m.id, guild: m.guild.id, channel: m.channel.id, attachments: m.attachments};
      multi.forEach((str, i) => {
        if ((str !== '' && str !== ' ') || cache.attachments.size > 0) { //skip empty strings
          cache.string = str;
          if (data[`${m.id}.${i}`] !== undefined) {
            return;
          } else {
            data[`${m.id}.${i}`] = cache;
          }
        }
      });
      last[m.channel.id] = cache;
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
  const config = settings.settings.chatter;
  let r = 0;

  client.user.setStatus('dnd');
  console.log('[Reading messages]');
  const last = {};
  textChannels.forEach(tc=> last[tc.id] = {});
  last[message.channel.id] = message;
  buildData(last, textChannels, data, r).then(() => {
  }).catch((err) => {
    console.error(err);
  }).finally(() => {
    markov = new Markov(Object.values(data).flat(2), config.corpus);
    markov.buildCorpusAsync().then(() => {
      client.user.setStatus('online');
    }).catch((err) => {
      console.error(err);
      client.user.setStatus('idle');
    }).finally(() => {
      client.user.setStatus('online');
    });
    console.log('[Done.]:', Object.values(data).length);
  });
};
settings.loadConfig();

exports.saveData = saveData;
exports.loadData = loadData;
exports.buildData = readMessages;

