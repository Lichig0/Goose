require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const fs = require('fs');

const COMMANDS_DIR = './commands/';
const initTables = require('./dbactions/initTables');
const settings = require('./settings');
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildInvites
  ],
  presence: {
    activities: [
      {name:'👀', type:'WATCHING'}
    ]
  },
  partials: [
    Partials.Channel,
    // Partials.User,
    // Partials.Message,
    // Partials.Reaction,
  ]
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

  // Setup uncaught exception callback
  process.setUncaughtExceptionCaptureCallback((err) => {
    client.users.fetch(`${client.owner}`).then(user => {
      user.createDM().then(dmChannel => {
        dmChannel.send(`${client.user.tag} encountered ${err}`);
      }).catch(console.error);
    }).catch(console.error);
  });

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
  // client.application.commands.set(devCommandDataList, '637314469894160405').then(commands => console.log('[Dev Commands]',commands.map(c=>c.name))).catch(console.error);
  client.application.commands.set(devCommandDataList, '879911779055058974').then(commands => console.log('[Dev Commands]',commands.map(c=>c.name))).catch(console.error);
  client.application.commands.set(commandDataList).then(commands => console.log(`[Commands] ${commands.map(c=>c.name)}`)).catch(console.error);
});


client.login(process.env.BOT_TOKEN).catch(console.error);
