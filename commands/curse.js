const { Permissions } = require("discord.js")

module.exports = (message, epeen, who = undefined) => {
    const role_perm = epeen.has(Permissions.FLAGS.MANAGE_ROLES);
    let members = who || message.mentions.members;
    const guild = message.guild;
    if(message.mentions.everyone) {
        members = message.channel.members;
    }
    if (!members || !message.guild) {
        return;
    }

    let role = message.guild.roles.cache.find(r => r.name === "cursed")
    if (!role) {
        // Create a new role with data and a reason
        guild.roles.create({
            data: {
                name: 'cursed',
                color: '#2B2B2B',
                position: 10,
                permissions: new Permissions(327744),
            },
            reason: 'Sometimes you need to silence the people.',
        }).then((r) => {
            role = r;
        }).catch((err) => {
            console.error(err)
            return;
        });

    }
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
