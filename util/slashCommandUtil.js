// This is a interm untility for slash commands until DiscordJS releases their library tools.
const Discord = require('discord.js');
const fs = require('fs');
const COMMANDS_DIR = './commands/';
const commands = {};
const state = {};

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

const _getRegisteredCommands = () => state.client.api.applications(state.client.user.id).commands.get;
const _registerCommand = () => state.client.api.applications(state.cliient.user.id).commands.post; 
const _removeRegisteredCommand = (id) => state.client.api.applications(state.client.user.id).commands(id).delete;
const _updateRegisteredCommand = (id) => state.client.api.applications(state.client.user.id).commands(id).patch;
const _updateCommandResponse = (token) => state.client.api.webhooks(state.client.user.id, token).messages('@original').patch;
const _commandResponse = (id, token) => state.client.api.interactions(id, token).callback.post;

const initSlashCommands = (client) => {
  if (!client) {
    console.error('Need client', client);
    return;
  }
  state.client = client;
  _getRegisteredCommands()().then(registeredCommands => {
    const RCNameSet = new Set(registeredCommands.map(rc=> rc.name));
    const slashCommands = state.slashCommands = new Set(Object.keys(commands).filter(c => commands[c].getCommandData));
    //Add or update commands
    slashCommands.forEach(slashCommand => {
      //If already registered, update.
      const cd = {data:commands[slashCommand].getCommandData()};
      if(RCNameSet.has(slashCommand)) {
        const {id} = registeredCommands.find(rc=>rc.name === slashCommand);
        console.log(`${slashCommand} already registered`);
        _updateRegisteredCommand(id)(cd).catch(console.error);
        return;
      }
      _registerCommand()(cd).catch(console.error); 
    });
    const toRemove = new Set([...RCNameSet].filter(rc => !slashCommands.has(rc)));
    toRemove.forEach(depricatedCommand => {
      const {id} = registeredCommands.find(rc=>rc.name === depricatedCommand);
      _removeRegisteredCommand(id)().catch(console.error);
    });
  }).catch(console.error);
  client.ws.on('INTERACTION_CREATE', _onInteract);
};

const _onInteract = async (interaction) => {
  const interactionName = interaction.data.name;

  if(commands[interactionName] && commands[interactionName].interact) {
    const userPermission = new Discord.Permissions(Number.parseInt(interaction.member.permissions));
    console.log(userPermission.toArray());
    const data = await commands[interactionName].interact(state.client, interaction, (send) => {
      _updateCommandResponse(interaction.token)(send).catch(console.error);
    });
    _commandResponse(interaction.id, interaction.token)(data).catch(console.error);
  }
};

exports.initSlashCommands = initSlashCommands;
// exports.onInteract = onInteract;