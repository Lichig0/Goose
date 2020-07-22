const { Permissions } = require("discord.js")

module.exports = (message, epeen, who = undefined) => {
    const role_perm = epeen.has(Permissions.FLAGS.MANAGE_ROLES);
    const member = who || message.mentions.members.first();
    if (!member) {
        return;
    }
    if (!member.manageable || !role_perm) {
        return message.reply(`Honk.`)
    }
    let role = message.guild.roles.cache.find(r => r.name === "cursed")
    if (!message.content.includes('lift')) {
        return member.roles.add(role);
    } else {
        return member.roles.remove(role);
    }

}
