const { Permissions } = require("discord.js");
const fs = require("fs");
const commands = {};
fs.readdir("./commands/", (err, files) => {
    files.forEach(file => {
        const commandName = file.split(".")[0];
        commands[commandName] = require(`../commands/${file}`);
    });
});
console.log(commands);

module.exports = (client, message) => {
    const {content, author, guild, channel} = message;
    let command = undefined;
    if (!content.startsWith(".") || !guild) {
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