const {Permissions} = require('discord.js');
const path = require('path');
const COMMAND_NAME = path.basename(__filename, '.js');
const chatter = require('../chatter/chatter');
const commands = {};
const fs = require('fs');

const audit = {
  timestamp: Date.now()
};
const emojiRegex = new RegExp(/:[^:\s]*(?:::[^:\s]*)*:/);
module.exports.audit = () => audit;

fs.readdir('./commands/', (err, files) => {
  files.forEach(file => {
    const commandName = file.split('.')[0];
    commands[commandName] = require(`../commands/${file}`);
  });
});

module.exports.run = (message, epeen) => {
  const admin_perm = epeen.has(Permissions.FLAGS.ADMINISTRATOR);
  const { client, content } = message;
  let says = content.split(' ').slice(1).join(' '); // remove says
  let channels = [message.channel];
  audit.timestamp = Date.now();
  audit.lastUsedBy = `${message.author.tag}[${message.author.id}]`;
  audit.usedIn = `${message.channel.name}[${message.channel.id}]`;
  if (message.mentions && message.mentions.channels.size > 0) {
    channels = message.mentions.channels.array();
    channels.forEach(ch => {
      says = says.replace(`<#${ch.id}>`, '');
    });
  }
  says = says.replace(emojiRegex, (match) => {
    const emoji = client.emojis.cache.find((emote) => `:${emote.name}:` == match);
    console.log(emoji.identifier);
    return says.includes(emoji.toString()) ? match : emoji.toString();
  });

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

};

exports.getCommandData = () => {
  return {
    name: COMMAND_NAME,
    description: 'Audit this bot\'s activity',
    options: [{
      name: 'id',
      type: 3,
      description: 'ID to audit',
      required: true,
    },{
      name: 'activity',
      type: 3,
      description: 'What activity to audit(chatter, or a command name). Defaults to chatter.',
      required: false,
    }]
  };
};

exports.execute = async (client, interaction) => {
  const activityId = interaction.options.get('id').value;
  const activity = interaction.options.get('activity').value || 'chatter';
  let auditJSON;
  if (client.commands.get(activity) !== undefined) {
    auditJSON = commands[activity].audit(activityId);
  } else if (activity === 'chatter') {
    auditJSON = chatter.audit(activityId);
  }
  const response = `Audit:\n ${'```'}${JSON.stringify(auditJSON, null, 2)}${'```'}`;
  return interaction.reply({content: response, ephemeral: true});
};

exports.dev = false;
