module.exports = (client, member) => {
  // Send the message to a designated channel on a server:
  const channel = member.guild.systemChannel;
  // Do nothing if the channel wasn't found on this server
  if (!channel) return;
  // Send the message, mentioning the member
  channel.send(`${member}[${member.user.username}] left.`);
};
