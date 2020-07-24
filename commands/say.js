const {Permissions} = require("discord.js");
module.exports = (message, epeen) => {
  const role_perm = epeen.has(Permissions.FLAGS.MANAGE_ROLES);
  const { content } = message
  const says = content.split(' ').slice(2).join(' ');
  if(!message.mentions) {
    return;
  }
  let channels = message.mentions.channels;

  if (!channels || !message.guild || says==='' || !role_perm) {
    return;
  }

  channels.array().forEach(ch => {
    if(ch.viewable) {
      return ch.send(says);
    }
  });

}
