module.exports = (client, member) => {
  // Send the message to a designated channel on a server:
  const channel = member.guild.systemChannel;
  // Do nothing if the channel wasn't found on this server
  if (!channel) return;
  // Send the message, mentioning the member
  channel.send(`${member}[${member.user.username}] left.`);
  if (member.user && member.user.dmChannel) {
    channel.createInvite({maxUses: 1}).then(invite => {
      member.user.dmChannel.send(`*Continue?* ${invite.url}`);
    }).catch(error => {console.error(error);});
  }
};