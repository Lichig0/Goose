const { Permissions } = require("discord.js");
const fs = require("fs");
const chatter = require('../chatter/chatter');


const commands = {};
fs.readdir("./commands/", (err, files) => {
    files.forEach(file => {
        const commandName = file.split(".")[0];
        commands[commandName] = require(`../commands/${file}`);
    });
});
console.log(commands);
let config = {};
fs.readFile('settings.json', 'utf8', function (err, data) {
    if (err) {
        return console.log(err);
    }
    config = JSON.parse(data);
    config.prefix = config.prefix || '.'
});

module.exports = (client, message) => {
    const {content, author, guild, channel, mentions} = message;

    //const data = [];
    let command = undefined;

    if (!content.startsWith(config.prefix) || !guild) {
       chatter.run(message, client);
    } else {
        command = content.split(' ')[0].toLowerCase().slice(1);
    }
    console.log(`
    >command: ${command || content}
    guild: ${guild}
    channel: ${channel}
    author: ${author}`);
    const epeen = guild ? guild.member(author).permissions : new Permissions(Permissions.ALL);
    console.log(epeen);
    if(guild) {
        const role_perm = epeen.has(Permissions.FLAGS.MANAGE_ROLES);
        const kick_perm = epeen.has(Permissions.FLAGS.KICK_MEMBERS);
        const kp = epeen.has(Permissions.FLAGS.ADMINISTRATOR);
        console.log(`    test: ${kp}\n    Role: ${role_perm}\n    Kick: ${kick_perm}`);
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
