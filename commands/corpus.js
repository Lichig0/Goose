const chatter = require('../chatter/chatter');
const { Permissions } = require('discord.js');
module.exports = (message, epeen) => {
  const {client, channel, guild} = message;
  const admin_perm = epeen.has(Permissions.FLAGS.ADMINISTRATOR);
  if (admin_perm){
    const textChannels = guild.channels.cache.filter(ch => ch.name == channel.name && ch.viewable);
    chatter.buildData(message, textChannels);
  } else {
      message.react('🦆');
  }
  return
}