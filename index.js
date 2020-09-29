require('dotenv').config();
const Discord = require('discord.js');
const fs = require('fs');
const initTables = require('./dbactions/initTables');
const settings = require('./settings');
const client = new Discord.Client({ retryLimit: 3, presence: { activity:{name:'👀', type:'WATCHING'}}});

settings.loadConfig();
fs.readdir('./events/', (err, files) => {
  files.forEach(file => {
    const eventHandler = require(`./events/${file}`);
    const eventName = file.split('.')[0];
    client.on(eventName, arg => eventHandler(client, arg));
  });
});
initTables();

client.login(process.env.BOT_TOKEN);