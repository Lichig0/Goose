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
  /*
  SUB_COMMAND	1
SUB_COMMAND_GROUP	2
STRING	3
INTEGER	4
BOOLEAN	5
USER	6
CHANNEL	7
ROLE	8
MENTIONABLE	9
*/

  // return {
  //   name: COMMAND_NAME,
  //   description: 'Pong.',
  //   default_permission: true,
  // };
  const slashCommand = new SlashCommandBuilder().setName(COMMAND_NAME).setDescription('Pong~ | . |');
  return slashCommand.toJSON();
};
module.exports.interact = () => {
  return { data: {
    type: 4,
    data: {
      content: 'Pong~',
      flags: 1 << 6
    }}
  };
};

module.exports.execute = async (client, interaction) => {
  console.log(interaction.member, interaction);
  await interaction.reply({
    content: 'Pong~?!',
    ephemeral: true
  });
};
