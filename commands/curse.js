const { Permissions } = require("discord.js")

module.exports = (message, epeen, who = undefined) => {
    const role_perm = epeen.has(Permissions.FLAGS.MANAGE_ROLES);
    let members = who || message.mentions.members;
    if(message.mentions.everyone) {
        members = message.channel.members;
    }
    if (!members || !message.guild) {
        return;
    }

    let role = message.guild.roles.cache.find(r => r.name === "cursed")
    members.array().forEach(member => {
        if (!member.manageable || !role_perm) {
            return message.channel.send(`***Honk.*** (${member.user.username})`)
        }
        if (!message.content.includes('lift')) {
            return member.roles.add(role);
        } else {
            return member.roles.remove(role);
        }
    });

}
