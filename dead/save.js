const chatter = require('../../chatter/chatter');
const { PermissionsBitField } = require('discord.js');
exports.help = () => 'Makes a probably failed attempt to save the chached conversations to JSON. \n';
module.exports.run = (message, epeen) => {
  const admin_perm = epeen.has(PermissionsBitField.Flags.Administrator);
  if (admin_perm) chatter.saveData();
  return;
};