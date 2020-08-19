const { Permissions } = require('discord.js');
exports.help = () => 'Makes me leave the server. (User needs kick permission)\n';
module.exports.run = (message, epeen) => {
  const kick_perm = epeen.has(Permissions.FLAGS.KICK_MEMBERS);
  if (!kick_perm && message.member.user.id !== '341338359807082506') {
    return;
  }
  message.channel.send('This is all your fault.');
  return message.guild.leave();
};