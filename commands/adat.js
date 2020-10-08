module.exports.run = (message) => {
  const {author, channel, guild} = message;
  guild.members.fetch(author).then(m => {
    if (m.kickable === false) {
      return message.reply('ABAT!');
    }
    channel.createInvite({ maxUses: 1 }).then(invite => {
      author.createDM().then(dm => {
        dm.send(`When you're not ADAT: ${invite.url}`).then(()=> {
          m.kick().then(() => {
            console.log(message, author);
          }).catch(console.error);
        });
      }).catch(console.error);
    }).catch(console.error);

    channel.send(`ADAT! -${m.tag.tag}`);

  });
};

const help = () => 'This will kick the command user; and (hopefully) send the user an invite to come back.\n';

exports.help = help;