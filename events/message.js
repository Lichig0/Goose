const kick = require("../commands/kick");
const pong = require("../commands/ping");
const curse = require("../commands/curse");
const insult = require("../commands/insult");
const leave = require("../commands/leave");
const Discord = require("discord.js");
module.exports = (client, message) => {
    const {content, author, guild} = message;
    if (!content.startsWith(".")) {
        return // do nothing
    }
    // console.log((guild.member(author).permissions & Discord.Permissions.FLAGS.MANAGE_ROLES) === Discord.Permissions.FLAGS.MANAGE_ROLES)
    const epeen = guild.member(author).permissions;
    const role_perm = epeen.has(Discord.Permissions.FLAGS.MANAGE_ROLES);
    const kick_perm = epeen.has(Discord.Permissions.FLAGS.KICK_MEMBERS);
    const kp = epeen.has(Discord.Permissions.FLAGS.ADMINISTRATOR);
    console.log(`
    test: ${kp}
    Role: ${role_perm}
    Kick: ${kick_perm}
    `);
    if (content.startsWith(".kick")) {
        return kick_perm ? kick(message) : author.createDM().then(dm => dm.send("Your authority is not recognized in Fort Kickass."));
    }
    else if (content.startsWith(".curse")) {
        return role_perm ? curse(message) : author.createDM().then(dm => dm.send("Your authority is not recognized in Fort Kickass."));
    }
    else if (content === ".insult"){
        return kick_perm ? insult(message) : curse(message, author);
    }
    else if (content === ".ping") {
        return pong(message);
    }
    else if (content === ".honk") {
        author.createDM().then(dm => {
            dm.send("HONK");
            dm.send("HONK");
            dm.send("HONK");
        });
    }
    else if (content === ".kys" && kick_perm === true) {
        return leave(message);
    }
}