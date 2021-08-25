// This is a interm untility for slash commands until DiscordJS releases their library tools.
const Discord = require('discord.js');
// const { REST } = require('@discordjs/rest');
// const { Routes } = require('discord-api-types/v9');
const fs = require('fs');
const COMMANDS_DIR = './commands/';
const commands = {};
const state = {};
// const botToken = process.env.BOT_TOKEN;


fs.readdir(COMMANDS_DIR, (err, files) => {
  files.forEach(file => {
    const commandName = file.split('.')[0];
    if(commandName === 'base') {
      const baseCommand = require(`.${COMMANDS_DIR}${file}`);
      commands[commandName] = new baseCommand;
    }
    commands[commandName] = require(`.${COMMANDS_DIR}${file}`);
  });
});

// const _getRegisteredCommands = () => state.client.api.applications(state.client.user.id).commands.get;
// const _registerCommand = () => state.client.api.applications(state.client.user.id).commands.post;
// const _registerDevCommand = () => state.client.api.applications(state.client.user.id).guilds('637314469894160405').commands.post;
// const _removeDevCommand = (id) => state.client.api.applications(state.client.user.id).guilds('637314469894160405').commands(id).delete;
// const _getRegisteredDevCommands = () => state.client.api.applications(state.client.user.id).guilds('637314469894160405').commands.get;
// const _updateRegisteredDevCommand = (id) => state.client.api.applications(state.client.user.id).guilds('637314469894160405').commands(id).patch;
// const _removeRegisteredCommand = (id) => state.client.api.applications(state.client.user.id).commands(id).delete;
// const _updateRegisteredCommand = (id) => state.client.api.applications(state.client.user.id).commands(id).patch;
const _updateCommandResponse = (token) => state.client.api.webhooks(state.client.user.id, token).messages('@original').patch;
const _commandResponse = (id, token) => state.client.api.interactions(id, token).callback.post;

const initSlashCommands = (client) => {
  if (!client) {
    console.error('Need client', client);
    return;
  }
  state.client = client;
  // _getRegisteredCommands()().then(registeredCommands => {
  //   const RCNameSet = new Set(registeredCommands.map(rc=> rc.name));
  //   const slashCommands = state.slashCommands = new Set(Object.keys(commands).filter(c => commands[c].getCommandData));
  //   //Add or update commands
  //   slashCommands.forEach(slashCommand => {
  //     //If already registered, update.
  //     const cd = {data:commands[slashCommand].getCommandData()};
  //     if(RCNameSet.has(slashCommand)) {
  //       const {id} = registeredCommands.find(rc=>rc.name === slashCommand);
  //       console.log(`${slashCommand} already registered`);
  //       _updateRegisteredCommand(id)(cd).catch(console.error);
  //       return;
  //     }
  //     _registerCommand()(cd).catch(console.error);
  //   });
  //   const toRemove = new Set([...RCNameSet].filter(rc => !slashCommands.has(rc)));
  //   toRemove.forEach(depricatedCommand => {
  //     const {id} = registeredCommands.find(rc=>rc.name === depricatedCommand);
  //     _removeRegisteredCommand(id)().catch(console.error);
  //   });
  //   // Dev Commands
  //   _getRegisteredDevCommands()().then(serverSlashCommands => {
  //     const SSCNameSet = new Set(serverSlashCommands.map(rc=>rc.name));
  //     slashCommands.forEach(slashCommand => {
  //       const cd = {data:commands[slashCommand].getCommandData()};
  //       if(SSCNameSet.has(slashCommand)) {
  //         const {id} = serverSlashCommands.find(rc=>rc.name === slashCommand);
  //         console.log(`server has ${slashCommand}`);
  //         _updateRegisteredDevCommand(id)(cd).catch(console.error);
  //         return;
  //       }
  //       _registerDevCommand()(cd).catch(console.error);
  //     });
  //     const toRemoveDev = new Set([...SSCNameSet].filter(rc => !slashCommands.has(rc)));
  //     toRemoveDev.forEach(depricatedCommand => {
  //       const {id} = serverSlashCommands.find(rc=>rc.name === depricatedCommand);
  //       _removeDevCommand(id)().catch(console.error);
  //     });
  //   }).catch(console.error);
  // }).catch(console.error);
  client.ws.on('INTERACTION_CREATE', _onInteract);
};

const _onInteract = async (interaction) => {
  const interactionName = interaction.data.name;

  if(commands[interactionName] && commands[interactionName].interact) {
    const userPermission = new Discord.Permissions(BigInt(interaction.member.permissions));
    console.log(userPermission.toArray());
    const data = await commands[interactionName].interact(state.client, interaction, (send) => {
      _updateCommandResponse(interaction.token)(send).catch(console.error);
    });
    _commandResponse(interaction.id, interaction.token)(data).catch(console.error);
  }
};

exports.initSlashCommands = initSlashCommands;
// exports.onInteract = onInteract;
