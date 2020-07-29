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

module.exports = (client, message) => {
    const {content, author, guild, channel, mentions} = message;
    const data = [];
    let command = undefined;

    if (mentions.has(client.user.id)) {
        channel.startTyping()
        channel.messages.fetch({ limit: 100 })
            .then(mgs => {
                let last = ''
                mgs.forEach((m, i , s) => {
                    data.push(m.cleanContent.split('\n'));
                    last = m.id
                });
                if(mgs.size === 100) {
                    buildData(last, channel, data);
                }
            }).then(() => {
                const markov = new Markov(data.flat(2), { stateSize: 2 })
                markov.buildCorpus()

                const options = {
                    maxTries: 500, // Give up if I don't have a sentence after 20 tries (default is 10)
                    prng: Math.random, // An external Pseudo Random Number Generator if you want to get seeded results
                    filter: (result) => {
                    return result.string.split(' ').length >= 2// At least 2 words
                    }
                }
                // Generate a sentence
                const result = markov.generate(options)
                channel.stopTyping(true);
                return channel.send(result.string);
            })
            .catch(err => {
                console.error(err); channel.stopTyping(true);
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


const buildData = function (o, channel, data) {
    console.log('recursing....');
    return channel.messages.fetch({ limit: 100, before: o })
        .then(mgs => {
            let last = ''
            mgs.forEach((m, i, s) => {
                data.push(m.cleanContent.split('\n'));
                last = m.id
            });
            if (mgs.size === 100 && data.length < 10000) {
                buildData(last, channel, data);
            }
        }).catch(err => console.error(err));
}