module.exports = (client, member) => {
  console.log(`${member} joined.`);
  const role = member.guild.roles.cache.find('name', 'Member');
  member.addRole(role);
  // Send the message, mentioning the member
  // channel.send(`${member}[${member.user.username}] Joined.`);
}