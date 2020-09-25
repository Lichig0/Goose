const { Permissions } = require('discord.js');
const fs = require('fs');
const chatter = require('../chatter/chatter');
const settings = require('../settings');


const commands = {};
fs.readdir('./commands/', (err, files) => {
  files.forEach(file => {
    const commandName = file.split('.')[0];
    commands[commandName] = require(`../commands/${file}`);
  });
  console.log(commands);
});

const reloadConfig = () => {
  settings.loadConfig();
};

module.exports = (client, message) => {
  const {content, author, guild, channel} = message;
  const config = settings.settings;
  const disabledCommand = config.disabledCommands || [];
  const prefix = config.prefix || '.';
  if(!guild) return;
  //const data = [];
  let command = undefined;

  if (!content.startsWith(prefix) || !guild) {
    chatter.run(message, client);
  } else {
    command = content.split(' ')[0].toLowerCase().slice(1);
  }
  if (command) {
    console.log(`
        >command: ${command || content}
        guild: ${guild}
        channel: ${channel}
        author: ${author}`);
  }
  const epeen = guild ? guild.member(author).permissions : new Permissions(Permissions.ALL);
  if(guild && command) {
    const role_perm = epeen.has(Permissions.FLAGS.MANAGE_ROLES);
    const kick_perm = epeen.has(Permissions.FLAGS.KICK_MEMBERS);
    const kp = epeen.has(Permissions.FLAGS.ADMINISTRATOR);
    console.log(`    test: ${kp}\n    Role: ${role_perm}\n    Kick: ${kick_perm}`);
  }


  if (commands[command] && !disabledCommand.includes(command)) {
    if (!guild) {
      return;
    }
    const role_perm = epeen.has(Permissions.FLAGS.MANAGE_ROLES);
    const kp = epeen.has(Permissions.FLAGS.ADMINISTRATOR);
    guild.members.fetch(author).then(m => {
      const hasRole = m.roles.cache.find(r => r.name == 'Bot Abuser');
      if (!hasRole || kp || role_perm) return commands[command].run(message, epeen);
    });
  }

  // Aliases
  let helpText = 'Commands are:\n\t';
  switch(command) {
  case 'g':
    return commands['google'].run(message, epeen);
  case 'kys':
    return commands['leave'].run(message, epeen);
  case 'help':
    Object.keys(commands).filter(com => !disabledCommand.includes(com)).forEach(key => { helpText = helpText + `\`${key}\` ${commands[key].help ? commands[key].help() : ''}` + '\t'; });
    return channel.send(helpText);
  case 'fl':
    reloadConfig();
    return;
  default:
    return;
  }
};
