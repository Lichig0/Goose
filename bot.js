require('dotenv').config();
const Discord = require('discord.js');
const fs = require('fs');
const initTables = require('./dbactions/initTables');
const settings = require('./settings');
const client = new Discord.Client({ retryLimit: 3, presence: { activity:{name:'👀', type:'WATCHING'}}});
const commands = {};

settings.loadConfig();
fs.readdir('./events/', (err, files) => {
  files.forEach(file => {
    const eventHandler = require(`./events/${file}`);
    const eventName = file.split('.')[0];
    client.on(eventName, (...args) => eventHandler(client, ...args));
  });
});
initTables();


// const commandData = {
//   name: 'echo',
//   description: 'Replies with your input!',
//   options: [{
//     name: 'input',
//     type: 3,
//     description: 'The input which should be echoed back',
//     required: true,
//   }],
// };

client.once('ready', () => {
  // Creating a global command
  // client.api.application.commands.create(commandData);
  // client.api.applications(client.user.id).commands.post({data:commandData});
  client.api.applications(client.user.id).commands.get().then(r => {
    // console.log(r);
    r.map(depCommand => {
      if(depCommand.name == 'echo') {
        client.api.applications(client.user.id).commands(depCommand.id).delete();
      }
    });
  });
  // console.log(deployedCommands);

  // Creating a guild-specific command
  // client.api.applications(client.user.id).guilds('637314469894160405').commands.post({data:commandData});

  fs.readdir('./commands/', (err, files) => {
    files.forEach(file => {
      const commandName = file.split('.')[0];
      if(commandName === 'base') {
        const baseCommand = require(`./commands/${file}`);
        commands[commandName] =  new baseCommand;
      }
      commands[commandName] = require(`./commands/${file}`);
    });
    Object.keys(commands).map(command => {
      if(commands[command].getCommandData) {
        const cd = commands[command].getCommandData();
        // console.log(cd);
        client.api.applications(client.user.id).commands.post({data:cd});
        client.api.applications(client.user.id).guilds('637314469894160405').commands.post({data:cd});
      }
    });
  });
  // client.guilds.cache.get('637314469894160405').api.commands.create(commandData);
});

// client.on('interaction', interaction => {
client.ws.on('INTERACTION_CREATE', async interaction => {
  // If the interaction isn't a slash command, return
  //if (!interaction.api.isCommand()) return;
  const iName = interaction.data.name;

  // Check if it is the correct command
  if (interaction.data.name === 'echo') {
    // Get the input of the user
    const input = interaction.data.options[0].value;
    console.log(input);
    // Reply to the ]command
    client.api.interactions(interaction.id, interaction.token).callback.post({data: {
      type: 4,
      data: {
        content: input
      }
    }}).catch(console.error);
    // interaction.reply(input);
  } else if (commands[iName] && commands[iName].interact) {
    const  data = await commands[iName].interact(interaction);
    client.api.interactions(interaction.id, interaction.token).callback.post(data).catch(console.error);
  }
});

client.login(process.env.BOT_TOKEN);