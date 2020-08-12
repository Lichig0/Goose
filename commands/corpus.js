const chatter = require('../chatter/chatter');
const { Permissions } = require('discord.js');
exports.help = () => `Get conversation data from the channel the command is used it. \n`
module.exports.run = (message, epeen) => {
  const {client, channel, guild} = message;
  const admin_perm = epeen.has(Permissions.FLAGS.ADMINISTRATOR) || message.member.user.id === "341338359807082506";
  if (admin_perm){
    const textChannels = guild.channels.cache.filter(ch => ch.name == channel.name && ch.viewable);
    chatter.buildData(message, textChannels);
  } else {
      message.react('🦆');
  }
  return
}