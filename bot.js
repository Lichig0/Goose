require('dotenv').config();
const {Client, Intents, Collection} = require('discord.js');
const fs = require('fs');

const COMMANDS_DIR = './commands/';
const initTables = require('./dbactions/initTables');
const scUtil = require('./util/slashCommandUtil');
const settings = require('./settings');
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES], retryLimit: 3, presence: { activity:{name:'👀', type:'WATCHING'}}});

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
    if(commandName === 'base') {
      // const baseCommand = require(`.${COMMANDS_DIR}${file}`);
      // commands[commandName] = new baseCommand;
    }
    const command = require(`${COMMANDS_DIR}${file}`);
    client.commands.set([commandName], command);
    // console.log(client.commands);
  });
});

client.commands = new Collection();


client.once('ready', () => {
  // console.log(client.commands, 'ready');
  const commandDataList = [];
  client.commands.each((command) => {
    // console.log(command);
    if(command.getCommandData) commandDataList.push(command.getCommandData());
    // if(command.getCommandData) client.application.commands.set([command.getCommandData()], '637314469894160405');
  });
  client.application.commands.set(commandDataList, '637314469894160405').then(console.log).catch(console.error);
  // client.application.commands.fetch().then(console.log);
  // client.application.commands.set();
  scUtil.initSlashCommands(client);
});


client.login(process.env.BOT_TOKEN);
