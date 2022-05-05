const path = require('path');
const COMMAND_NAME = path.basename(__filename, '.js');

module.exports.getCommandData = () => {
  return {
    name: COMMAND_NAME,
    description: 'Emote.',
  };
};

module.exports.execute = async (client, interaction) => {
  return interaction.reply(interaction.emojis.cache.random().toString()).catch(console.error);
};
