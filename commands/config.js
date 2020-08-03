const chatter = require('../chatter/chatter');
const { Permissions } = require('discord.js');
module.exports = (message, epeen) => {
  const admin_perm = epeen.has(Permissions.FLAGS.ADMINISTRATOR);
  if (admin_perm) {
    chatter.loadConfig(message.client);
  }
  return
}