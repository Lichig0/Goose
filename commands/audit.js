const path = require('path');
const {EmbedBuilder, ApplicationCommandType, ContextMenuCommandBuilder} = require('discord.js');
const COMMAND_NAME = path.basename(__filename, '.js');
const chatter = require('../chatter/chatter');

exports.getCommandData = () => {
  return new ContextMenuCommandBuilder()
    .setName(COMMAND_NAME)
    .setType(ApplicationCommandType.Message).toJSON();
};

exports.getMessageCommandData = () => {
  return {
    name: COMMAND_NAME,
    type: ApplicationCommandType.Message
  };
};

exports.execute = async (client, interaction) => {
  const auditJSON = chatter.audit(interaction.targetId);
  const embed = new EmbedBuilder();
  embed.setTitle('Chatter Audit:');
  const fields = Object.entries(auditJSON).map(([name, value]) => {
    return { 
      name,
      value: `${value}`.slice(0,1023),
    };
  });
  embed.setFields(fields);
  return interaction.reply({embeds: [embed], ephemeral: false}).catch(console.warn);
};

exports.dev = false;
