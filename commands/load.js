const chatter = require('../chatter/chatter');
const { Permissions } = require('discord.js');
exports.help = () => `Loads a cache.json; probably will fail.\n`;
module.exports.run = (message, epeen) => {
  const admin_perm = epeen.has(Permissions.FLAGS.ADMINISTRATOR);
  if (admin_perm) chatter.loadData(message.client);
  return
}