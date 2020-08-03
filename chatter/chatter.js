const Markov = require('markov-strings').default
const fs = require('fs');
const data = [{ string: 'honk' }];
let freq = process.env.FREQUENCY || 0.995;
let markov = new Markov(data.flat(2), { stateSize: 2 });
let reload = 0;
let config = {};


// TODO : turn this into a class?
module.exports.run = (message, client) => {
  const { author, channel, content, guild, mentions } = message;

  const isMentioned = mentions.has(client.user.id);
  const isHonk = channel.name === 'honk';
  const rand = Math.random();
  console.log(rand);
  const honkChannel = isMentioned ? guild.channels.cache.find(ch => ch.name === 'honk') : channel;

  if (rand > 0.98 || reload <= 0) {
    if (data.length == 1) data.pop();
    const textChannels = guild.channels.cache.filter(ch => ch.type == 'text' && ch.viewable);
    readMessages(message, textChannels);
    reload = 500;
    return;
  } else if ((isHonk || isMentioned || rand > config.randomChat) && !author.bot) {
    sendMarkovString(honkChannel, data, content);
  }
  reload--;
}


const saveData = () => {
  fs.writeFile('cache.json', JSON.stringify(data), function (err) {
    if (err) return console.log(err);
    console.log('Hello World > helloworld.txt');
  });
}

const loadData =(client) => {
  client.user.setStatus('dnd');
  fs.readFile('cache.json', 'utf8', function (err, data) {
    if (err) {
      return console.log(err);
    }
    data = JSON.parse(data);
    markov = new Markov(data.flat(2), { stateSize: 2 })
    markov.buildCorpusAsync().then(() => {
      // message.react('💡');
      client.user.setStatus('online');

    }).catch((err) => {
      console.error(err);
      client.user.setStatus('idle');
      // message.react('😵');
    });
    console.log('okay', data.length);
  });
}

const sendMarkovString = async (channel, data, content) => {
  channel.startTyping();
  console.log('okay', data.length);
  const includesWord = (word) => {
    console.log(content, word);
    return content.includes(word);
  }

  const options = {
    maxTries: 20, // Give up if I don't have a sentence after 20 tries (default is 10)
    prng: Math.random, // An external Pseudo Random Number Generator if you want to get seeded results
    filter: (result) => {
      return result.string.split(' ').length >= (Math.floor(Math.random() * 3) + 1) // At least 1-10 words
    }
  }
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
}


const buildData = async (o = false, channels, data, times) => {
  times++;

  // const msgs = await channel.messages.fetch({ limit: 100, before: o });
  const tasks = channels.array().flatMap((ch) => fetchMessages(ch, o));
  const msgs = await Promise.all(tasks);
  msgs.forEach(mm => {
    mm.forEach((m, i, s) => {
      const multi = m.cleanContent.split(/[\n.;]/);
      const cache = { string: m.cleanContent, mid: m.id, guide: m.guild, channel: m.channel }
      multi.forEach(str => {
        cache.string = str;
        data.push(cache);
      })
      last = cache
    });
  });
  if (data.length < config.arrayLimiter && times < 500) {
    await buildData(last, channels, data, times);
  }
}

const fetchMessages = async (channel, o) => {
  return o.channel === channel ? channel.messages.fetch({ limit: 100, before: o.id }) : channel.messages.fetch({ limit: 100 })
}

const readMessages = (message, textChannels) => {
  const {client} = message;
  let r = 0
  client.user.setStatus('dnd');
  console.log(`Reading messages`);
  buildData(message.id, textChannels, data, r).then(() => {
  }).catch((err) => {
    console.error(err);
  }).finally(() => {
    markov = new Markov(data.flat(2), { stateSize: 2 })
    markov.buildCorpusAsync().then(() => {
      // message.react('💡');
      client.user.setStatus('online');

    }).catch((err) => {
      console.error(err);
      client.user.setStatus('idle');
      // message.react('😵');
    });
    console.log('Done.', data.length);
  });
}

const loadConfig = () => {
  fs.readFile('settings.json', 'utf8', function (err, data) {
    if(err) {
      return console.log(err);
    }
    config = JSON.parse(data);
  });
}
loadConfig();

exports.saveData = saveData;
exports.loadData = loadData;
exports.buildData = readMessages;
exports.loadConfig = loadConfig;

