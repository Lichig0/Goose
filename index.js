require('dotenv').config();
const Discord = require('discord.js');
const fs = require('fs');
const initTables = require('./dbactions/initTables');
const client = new Discord.Client();

fs.readdir('./events/', (err, files) => {
  files.forEach(file => {
    const eventHandler = require(`./events/${file}`);
    const eventName = file.split('.')[0];
    client.on(eventName, arg => eventHandler(client, arg));
  });
});
initTables();
console.log(client.guilds);

client.login(process.env.BOT_TOKEN);