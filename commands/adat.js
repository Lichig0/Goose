module.exports = (message) => {
  const {author, channel} = message;
  if (!author.kickable) {
    return message.reply(`No.`)
  }
  return author
    .kick()
    .then(() => {
      console.log(message, author);
      channel.createInvite({ maxUses: 1 }).then(invite => {
        author.createDM().then(dm => {
          dm.send(`When you're not ADAT: ${invite.url}`)
        }).catch(error => console.error(error));
      }).catch(error => console.error(error));
      channel.send(`ADAT! -${author.tag.tag}`)
    })
    .catch(error => message.reply(`Error.`))
}