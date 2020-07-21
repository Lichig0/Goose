const { Guild } = require("discord.js")

module.exports = (message, who = undefined) => {
    const member = who || message.mentions.members.first();
    if (!member) {
        return;
    }
    if (!member.manageable) {
        return message.reply(`Honk.`)
    }
    let role = message.guild.roles.cache.find(r => r.name === "cursed")
    if (!message.content.includes('lift')) {
        return member.roles.add(role);
    } else {
        return member.roles.remove(role);
    }
    
}
