module.exports = message => {
    const member = message.mentions.members.first()
    if (!member) {
        return message.reply(`Who are you trying to kick? You must mention a user.`)
    }
    if (!member.kickable) {
        return message.reply(`I can't.`)
    }
    return member
        .kick()
        .then(() => {
            message.reply(`${member.user.tag} was kicked. Reason: ${message.content}`)
        })
        .catch(error => message.reply(`Error.`))
}