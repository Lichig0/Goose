const path = require('path');
const COMMAND_NAME = path.basename(__filename, '.js');
const chatter = require('../chatter/chatter');
const commands = {};

exports.getCommandData = () => {
  return {
    name: COMMAND_NAME,
    description: 'Audit this bot\'s activity',
    options: [{
      name: 'id',
      type: 3,
      description: 'ID to audit',
      required: true,
    },{
      name: 'activity',
      type: 3,
      description: 'What activity to audit(chatter, or a command name). Defaults to chatter.',
      required: false,
    }]
  };
};

exports.execute = async (client, interaction) => {
  const activityId = interaction.options.get('id').value;
  const activity = interaction.options.get('activity')?.value || 'chatter';
  let auditJSON;
  if (client.commands.get(activity) !== undefined) {
    auditJSON = commands[activity].audit(activityId);
  } else if (activity === 'chatter') {
    auditJSON = chatter.audit(activityId);
  }
  const response = `Audit:\n ${'```'}${JSON.stringify(auditJSON, null, 2)}${'```'}`;
  return interaction.reply({content: response, ephemeral: true});
};

exports.dev = false;
