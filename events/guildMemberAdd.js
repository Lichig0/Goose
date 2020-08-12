module.exports = (client, member) => {
  console.log(`${member} joined.`);
  const role = member.guild.roles.cache.find((r) => r.name == 'Member');
  console.log(`found ${role}`)
  if (role !== undefined) member.roles.add(role);
  member.createDM();
  // Send the message, mentioning the member
  // channel.send(`${member}[${member.user.username}] Joined.`);
}