const {Permissions} = require("discord.js");
const commands = {};
const fs = require("fs");
exports.help = () => `Make me say something.\n`;
fs.readdir("./commands/", (err, files) => {
  files.forEach(file => {
    const commandName = file.split(".")[0];
    commands[commandName] = require(`../commands/${file}`);
  });
});
module.exports.run = (message, epeen) => {
  const admin_perm = epeen.has(Permissions.FLAGS.ADMINISTRATOR);
  const { content } = message
  let says = content.split(' ').slice(1).join(' '); // remove says
  let channels = [message.channel];
  if (message.mentions && message.mentions.channels.size > 0) {
    channels = message.mentions.channels.array()
    channels.forEach(ch => {
      says = says.replace(`<#${ch.id}>`, '');
    })
  }

  if (commands[says.split(' ')[0].toLowerCase().slice(1)] && !admin_perm){
    return message.channel.send('Quack');
  }

  if (!channels || !message.guild) {
    return;
  }

  channels.forEach(ch => {
    if(ch.viewable) {
      return ch.send(says);
    }
  });

}
