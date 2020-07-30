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
const data = [];

module.exports = (client, message) => {
    const {content, author, guild, channel, mentions} = message;
    const isMentioned = mentions.has(client.user.id);
    const rand =  Math.random();
    console.log(rand);
    //const data = [];
    let command = undefined;

    if (isMentioned || rand > 0.9988) {
        channel.startTyping();
        const textChannels = guild.channels.cache.filter(ch => ch.type == 'text');
        const honkChannel = isMentioned ? guild.channels.cache.find(ch => ch.name === 'honk') : channel;
        let r = 0;
        buildData(message.id, channel, data, r).then(() => {
            sendMarkovString(honkChannel, data);
            channel.stopTyping(true);
        }).catch((err) => {
            console.error(err);
            channel.stopTyping(true);
        });

    } else if (!content.startsWith(".") || !guild) {
        return // do nothing
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

const sendMarkovString = (channel, data) => {
    console.log('okay', data.length);
    const markov = new Markov(data.flat(2), { stateSize: 2 })
    markov.buildCorpus()

    const options = {
        maxTries: 20, // Give up if I don't have a sentence after 20 tries (default is 10)
        prng: Math.random, // An external Pseudo Random Number Generator if you want to get seeded results
        filter: (result) => {
            return result.string.split(' ').length >= (Math.floor(Math.random() * 10)+1)// At least 1-10 words
        }
    }
    // Generate a sentence
    const result = markov.generate(options);
    channel.send(result.string);
}


const buildData = async (o, channel, data, times) => {
    times++;
    if( data.length > 10000 && times > 6) {
        return 0;
    }
    const msgs = await channel.messages.fetch({ limit: 100, before: o });
    msgs.forEach((m, i, s) => {
        data.push(m.cleanContent.split('\n'));
        last = m.id
    });
    if (msgs.size === 100 && data.length < 10000) {
            await buildData(last, channel, data, times);
    }
}
