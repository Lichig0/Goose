const { Guild } = require("discord.js")

module.exports = (message, who = undefined) => {
    const member = who || message.mentions.members.first();
    if (!member) {
        return;
    }
    if (!member.manageable) {
        return message.reply(`I can't.`)
    }
    let role = message.guild.roles.cache.find(r => r.name === "cursed")
    if (!message.content.includes('lift')) {
        return member
            .roles.add(role)
            .then(() => message.reply(`${member.user.tag} was cursed.`))
            .catch(error => {
                message.reply(`Error.`)
                console.error(error)
            })
    } else {
        return member
            .roles.remove(role)
            .then(() => message.reply(`${member.user.tag}'s cursed was lifted.`))
            .catch(error => {
                message.reply(`Error.`)
                console.error(error)
            })
    }
    
}
