const Markov = require('markov-strings').default;
const fs = require('fs');
const settings = require('../settings');
const data = {0:{ string: 'honk' }};
let markov = new Markov(Object.values(data).flat(2), { stateSize: 2 });
let reload = 0;


// TODO : turn this into a class?
module.exports.run = (message, client) => {
  const config = settings.settings;
  const { author, channel, content, guild, mentions } = message;
  const isMentioned = mentions.has(client.user.id);
  const isHonk = channel.name === 'honk';
  const theHonk = guild.channels.cache.find(ch => ch.name === 'honk') || channel;
  const rand = Math.random(); console.log(rand);
  const honkChannel = (isMentioned && config.useHonk) ? theHonk : channel;
  const disabled = config.chatter.disabledChannels || [];

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

const loadData =(client) => {
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
  console.log('okay', Object.values(data).length);
  // const includesWord = (word) => {
  //   console.log(content, word);
  //   return content.includes(word);
  // };

  const options = {
    maxTries: 20, // Give up if I don't have a sentence after 20 tries (default is 10)
    prng: Math.random, // An external Pseudo Random Number Generator if you want to get seeded results
    filter: (result) => {
      // return result.string.split(' ').length >= (Math.floor(Math.random() * 3) + 1) // At least 1-10 words
      return result.string.split (' ').length >= Math.pow(Math.floor(Math.random() * 3) + 1, Math.floor(Math.random() * 4 + 1)) ||
        (channel.guild.emojis.cache.find(e => e.name == result.string.split(':')[1]));
    }
  };
  // await markov.buildCorpusAsync()
  // Generate a sentence
  markov.generateAsync(options).then((result) => {
    let chatter = result.string;
    channel.stopTyping();
    channel.send(chatter);
  }).catch((e) => {
    console.log(e);
    channel.stopTyping();
  }).finally(() => channel.stopTyping(true));
};


const buildData = async (last = {}, channels, data, times) => {
  times++;
  const config = settings.settings;
  const tasks = channels.array().flatMap((ch) => fetchMessages(ch, last[ch.id]));
  const msgs = await Promise.all(tasks);
  const toCache = msgs.filter(m => m.size > 0);

  const splitter = RegExp(config.chatter.messageSplitter);

  toCache.filter(m => m.size > 0).forEach(mm => {
    mm.forEach((m) => {
      const multi = m.content.split(splitter);
      const cache = { string: m.content, id: m.id, guild: m.guild.id, channel: m.channel.id };
      multi.forEach((str, i) => {
        if (str !== '' || str !== ' ') { //skip empty strings
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
  return o.channel === channel.id ? channel.messages.fetch({ limit: 100, before: o.id }) : channel.messages.fetch({ limit: 100 })
};

const readMessages = async (message, textChannels) => {
  const {client} = message;
  const config = settings.settings;
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
    markov = new Markov(Object.values(data).flat(2), config.chatter.corpus);
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

