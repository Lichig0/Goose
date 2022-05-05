require('dotenv').config();
const {Client, Intents, Collection} = require('discord.js');
const fs = require('fs');

const COMMANDS_DIR = './commands/';
const initTables = require('./dbactions/initTables');
const settings = require('./settings');
const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_INVITES
  ],
  retryLimit: 3,
  presence: { activity:{name:'👀', type:'WATCHING'}
  }
});

settings.loadConfig();
fs.readdir('./events/', (err, files) => {
  files.forEach(file => {
    const eventHandler = require(`./events/${file}`);
    const eventName = file.split('.')[0];
    client.on(eventName, (...args) => eventHandler(client, ...args));
  });
});
initTables();

fs.readdir(COMMANDS_DIR, (err, files) => {
  files.forEach(file => {
    const commandName = file.split('.')[0];
    const command = require(`${COMMANDS_DIR}${file}`);
    client.commands.set(commandName, command);
  });
});

client.commands = new Collection();


client.once('ready', () => {
  const commandDataList = [];
  const devCommandDataList = [];
  client.commands.each((command) => {
    if(command.getCommandData) {
      if(command.dev) {
        devCommandDataList.push(command.getCommandData());
      } else {
        commandDataList.push(command.getCommandData());
      }
    }
  });
  client.application.commands.set(devCommandDataList, '637314469894160405').then(commands => console.log('[Dev Commands]',commands.map(c=>c.name))).catch(console.error);
  client.application.commands.set(commandDataList).then(commands => console.log(`[Commands] ${commands.map(c=>c.name)}`)).catch(console.error);
});


client.login(process.env.BOT_TOKEN).catch(console.error);
