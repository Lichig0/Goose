module.exports = (client, member) => {
  // Send the message to a designated channel on a server:
  const channel = member.guild.channels.cache.find(ch => ch.name === 'shitposting');
  // Do nothing if the channel wasn't found on this server
  if (!channel) return;
  channel.createInvite({ maxUses: 1 }).then(invite => {
    member.createDM().then(dm => {
      dm.send(`*Continue?* ${invite.url}`);
    }).catch(error => console.error(error));
  }).catch(error => console.error(error));
  // Send the message, mentioning the member
  channel.send(`${member}[${member.user.username}] left.`);
}