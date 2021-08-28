const { Permissions } = require('discord.js');

module.exports = async (client, interaction) => {
  const { member, guild} = interaction;
  const epeen = guild && member ? member.permissions : new Permissions(Permissions.DEFAULT);
  if(interaction.isCommand()) {
    const command = client.commands.get(interaction.commandName);
    // console.log(client.commands.has(interaction.commandName), interaction.commandName, client.commands.keys());
    try {
      await command.execute(client, interaction, epeen);
    } catch (error) {
      console.error(error);
      await interaction.reply({content: 'Whoops, something went wrong.', ephemeral: true});
    }
  }
};
