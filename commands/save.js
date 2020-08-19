const chatter = require('../chatter/chatter');
const { Permissions } = require('discord.js');
exports.help = () => 'Makes a probably failed attempt to save the chached conversations to JSON. \n';
module.exports.run = (message, epeen) => {
  const admin_perm = epeen.has(Permissions.FLAGS.ADMINISTRATOR);
  if (admin_perm) chatter.saveData();
  return;
};