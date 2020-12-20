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
    return;
  }

  const helpGen = () => {
    let helpText = 'Commands are: \n > ';
    const commandHelp = content.split(command)[1].trim();
    if (commands[commandHelp] !== undefined) {
      helpText = commands[commandHelp].help();
    } else {
      Object.keys(commands).filter(com => !disabledCommand.includes(com)).forEach(key => { helpText = helpText + `\`${key}\` `;});
    }
    return helpText;
  };

  const genAudit = () => {
    const auditCommand = content.split('audit')[1].trim();
    let auditJSON;
    if (commands[auditCommand] !== undefined) {
      auditJSON = commands[auditCommand].audit();
    } else if (auditCommand === 'chatter') {
      auditJSON = JSON.stringify(chatter.audit(), null, 2);
    }
    return `Audit:\n ${'```'}${JSON.stringify(auditJSON, null, 2)}${'```'}`;
  }

  // Aliases
  switch(command) {
  case 'g':
    return commands['google'].run(message, epeen);
  case 'kys':
    return commands['leave'].run(message, epeen);
  case 'help':
    return channel.send(helpGen()).catch(console.error);
  case 'audit':
    if( epeen.has(Permissions.FLAGS.ADMINISTRATOR)) {
      return channel.send(genAudit()).catch(console.error);
    }
    break;
  case 'fl':
    reloadConfig();
    return;
  case '':
  case undefined:
    return;
  default:
    message.react(client.emojis.cache.random().id).catch(console.error);
    return;
  }
};
