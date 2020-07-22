const { Permissions } = require("discord.js")

module.exports = (message, epeen) => {
    const kick_perm = epeen.has(Permissions.FLAGS.KICK_MEMBERS);
    if (!kick_perm) {
        return;
    }
    message.channel.send("This is all your fault.");
    return message.guild.leave();
}