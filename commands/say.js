const path = require('path');
const COMMAND_NAME = path.basename(__filename, '.js');

const audit = {
  timestamp: Date.now()
};
module.exports.audit = () => audit;

exports.getCommandData = () => {
  return {
    name: COMMAND_NAME,
    description: 'Make me say a thing',
    options: [{
      name: 'input',
      type: 3,
      description: 'What should be said',
      required: true,
    }]
  };
};

exports.execute = async (client, interaction) => {
  const input = interaction.options.get('input').value;
  return interaction.reply(input);
};
