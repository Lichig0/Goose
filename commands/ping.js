const path = require('path');
const { SlashCommandBuilder } = require('@discordjs/builders');
const COMMAND_NAME = path.basename(__filename, '.js');
exports.help = () => 'Pong? \n';
module.exports.run = message => {
  const { channel } = message;
  channel.send('Pong~');
  // author.createDM().then(dm => dm.send("Pong~"));
};
module.exports.getCommandData = () => {
  const slashCommand = new SlashCommandBuilder().setName(COMMAND_NAME).setDescription('Pong~ | . |');
  return slashCommand.toJSON();
};

module.exports.execute = async (client, interaction) => {
  await interaction.reply({
    content: 'Pong~?!',
    ephemeral: true
  }).catch(console.warn);
};
