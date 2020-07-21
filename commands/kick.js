module.exports = message => {
    const member = message.mentions.members.first()
    
    if (!member) {
        return message.reply(`Who are you trying to kick?`)
    }
    if (!member.kickable) {
        return message.reply(`No.`)
    }
    return member
        .kick()
        .then(() => {
            console.log(message, member);
            message.channel.send(`Bye. ${member.user.tag}`)
        })
        .catch(error => message.reply(`Error.`))
}