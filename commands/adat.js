module.exports.run = (message) => {
  const {author, channel, guild} = message;
  guild.members.fetch(author).then(m => {
    if (m.kickable === false) {
      return message.reply('ABAT!');
    }
    m.kick().then(() => {
      console.log(message, author);
      channel.createInvite({ maxUses: 1 }).then(invite => {
        author.createDM().then(dm => {
          dm.send(`When you're not ADAT: ${invite.url}`);
        }).catch(error => console.error(error));
      }).catch(error => console.error(error));
      channel.send(`ADAT! -${m.tag.tag}`);
    }).catch(() => message.reply('Error.'));
  });
};

const help = () => 'This will kick the command user; and (hopefully) send the user an invite to come back.\n';

exports.help = help;