const { PermissionsBitField } = require('discord.js');

const PARTING_WORDS = `
This is all your fault.
o7
`;

exports.help = () => 'Makes me leave the server. (User needs kick permission)\n';
module.exports.run = (message, epeen) => {
  const kick_perm = epeen.has(PermissionsBitField.Flags.KickMembers);
  if (!kick_perm && message.member.user.id !== '341338359807082506') {
    return;
  }
  message.channel.send(PARTING_WORDS).then(() => {
    message.guild.leave();
  });
};