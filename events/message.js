const { Permissions } = require("discord.js");
const fs = require("fs");
const Markov = require('markov-strings').default

const commands = {};
fs.readdir("./commands/", (err, files) => {
    files.forEach(file => {
        const commandName = file.split(".")[0];
        commands[commandName] = require(`../commands/${file}`);
    });
});
console.log(commands);

const freq = process.env.FREQUENCY || 0.995;
const data = [{string: 'honk'}];
let markov = new Markov(data.flat(2), { stateSize: 2 });

module.exports = (client, message) => {
    const {content, author, guild, channel, mentions} = message;
    const isMentioned = mentions.has(client.user.id);
    const rand =  Math.random();
    console.log(rand);
    //const data = [];
    let command = undefined;

    if (!content.startsWith(".") || !guild) {
        const honkChannel = isMentioned ? guild.channels.cache.find(ch => ch.name === 'honk') : channel;
        if (rand > 0.9 || data.length == 1) {
            if (data.length == 1) data.pop();
            const textChannels = guild.channels.cache.filter(ch => ch.type == 'text' && ch.viewable);
            let r = 0;
            // message.react('🤔');
            buildData(message.id, textChannels, data, r).then(() => {
            }).catch((err) => {
                console.error(err);
            }).finally(() => {
                markov = new Markov(data.flat(2), { stateSize: 2 })
                markov.buildCorpusAsync().then(()=>{
                    // message.react('💡');
                }).catch((err) => {
                    console.error(err);
                    // message.react('😵');
                });
                console.log('okay', data.length);
            });
            return;
        } else if(isMentioned || rand > 0.9) {
            sendMarkovString(honkChannel, data, content);
        }
    } else {
        command = content.split(' ')[0].toLowerCase().slice(1);
    }
    console.log(`
    >command: ${command}
    guild: ${guild}
    channel: ${channel}
    author: ${author}
    `);
    const epeen = guild ? guild.member(author).permissions : new Permissions(Permissions.ALL);
    console.log(epeen);
    if(guild) {
        const role_perm = epeen.has(Permissions.FLAGS.MANAGE_ROLES);
        const kick_perm = epeen.has(Permissions.FLAGS.KICK_MEMBERS);
        const kp = epeen.has(Permissions.FLAGS.ADMINISTRATOR);
        console.log(`
    test: ${kp}
    Role: ${role_perm}
    Kick: ${kick_perm}
    `);
    }


    if(commands[command]) {
        return commands[command](message, epeen);
    }

    // Aliases
    switch(command) {
        case 'kys':
            return commands['leave'](message, epeen);
        break;
        case 'help':
            return channel.send(`Commands are: ${Object.keys(commands)}`);
        break;
        default:
            return;
        break;
    }
}

const sendMarkovString = async (channel, data, content) => {
    channel.startTyping();
    console.log('okay', data.length);
    const includesWord = (word) => {
        console.log(content, word);
        return content.includes(word);
    }

    const options = {
        maxTries: 10, // Give up if I don't have a sentence after 20 tries (default is 10)
        prng: Math.random, // An external Pseudo Random Number Generator if you want to get seeded results
        filter: (result) => {
            return result.string.split(' ').length >= (Math.floor(Math.random() * 3)+1) // At least 1-10 words
        }
    }
    // await markov.buildCorpusAsync()
    // Generate a sentence
    markov.generateAsync(options).then((result) => {
        channel.stopTyping();
        channel.send(result.string);
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
            const multi = m.cleanContent.split('/[\n.;]');
            const cache = { string: m.cleanContent, mid: m.id, guide: m.guild, channel: m.channel }
            multi.forEach(str => {
                cache.string = str;
                data.push(cache);
            })
            last = cache
        });
    });
    if (data.length < 500000 && times < 500) {
            await buildData(last, channels, data, times);
    }
}

const fetchMessages = async (channel, o) => {
    return o.channel === channel ? channel.messages.fetch({ limit: 100, before: o.id }) : channel.messages.fetch({ limit: 100 })
}
