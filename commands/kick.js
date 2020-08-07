const { Permissions } = require('discord.js');
exports.help = () => `Kick a member.\n`;
module.exports.run = (message, epeen) => {
    const {author, channel, content, guild, mentions} = message;
    const member = mentions.members.first();
    // const epeen = guild ? guild.member(author).permissions : Discord.Permissions.FLAGS.ALL;
    const kick_perm = epeen.has(Permissions.FLAGS.KICK_MEMBERS);
    if (!member) {
        return message.reply(`Who are you trying to kick?`)
    }
    if (!member.kickable || !kick_perm) {
        return message.reply(`No.`)
    }
    return member
        .kick()
        .then(() => {
            console.log(message, member);
            channel.createInvite({ maxUses: 1 }).then(invite => {
                member.createDM().then(dm => {
                    dm.send(`Get kicked nerd.
                    "${content}"`)
                    dm.send(invite.url)
                }).catch(error => console.error(error));
            }).catch(error => console.error(error));
            channel.send(`Bye. ${member.user.tag}`)
        })
        .catch(error => message.reply(`Error.`))
}