const fs = require('fs');
const chatter = require('../chatter/chatter');
const settings = require('../settings');


const commands = {};
fs.readdir('./commands/', (err, files) => {
  files.forEach(file => {
    const commandName = file.split('.')[0];
    commands[commandName] = require(`../commands/${file}`);
  });
});

const reloadConfig = () => {
  settings.loadConfig();
};

module.exports = (client, message) => {
  const {content, author, guild, channel} = message;
  const config = settings.settings;
  const prefix = config.prefix || '.';
  if(!guild) return;
  let command = undefined;

  if (!content.startsWith(prefix) || !guild) {
    chatter.run(message, client);
  } else {
    command = content.split(' ')[0].toLowerCase().slice(1);
  }

  if (commands[command]) {
    if(author.bot) return;
    channel.send('I don\'t do this anymore. Try /').catch(console.error);
    return;
  }

  // Aliases
  switch(command) {
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
