const kick = require("../commands/kick");
const pong = require("../commands/ping");
const curse = require("../commands/curse");
const insult = require("../commands/insult");
const Discord = require("discord.js")
module.exports = (client, message) => {
    const {content, author, guild} = message;
    if (!content.startsWith(".")) {
        return // do nothing
    }
    // console.log((guild.member(author).permissions & Discord.Permissions.FLAGS.MANAGE_ROLES) === Discord.Permissions.FLAGS.MANAGE_ROLES)
    const role_perm = (guild.member(author).permissions & Discord.Permissions.FLAGS.MANAGE_ROLES) === Discord.Permissions.FLAGS.MANAGE_ROLES
    const kick_perm = (guild.member(author).permissions & Discord.Permissions.FLAGS.KICK_MEMBERS) === Discord.Permissions.FLAGS.KICK_MEMBERS
    console.log(`
    Role: ${role_perm}
    Kick: ${kick_perm}
    `);
    if (message.content.startsWith(".kick" && kick_perm)) {
        return kick(message)
    }
    else if (content.startsWith(".curse")) {
        
        return role_perm ? curse(message) : message.channel.send("Your authority is not recognized in Fort Kickass.")
    }
    else if (content === ".insult"){
        return insult(message);
    }
    else if (content === ".ping") {
        return pong(message);
    }
}