const { PermissionsBitField } = require('discord.js');

module.exports = async (client, interaction) => {
  console.log('[Interaction]');
  const { member, guild} = interaction;
  if(!interaction.guild) {
    return await interaction.reply('Not here').catch(console.error);
  }
  const epeen = guild && member ? member.permissions : new PermissionsBitField(PermissionsBitField.Default);
  if(interaction.isCommand()) {
    const command = client.commands.get(interaction.commandName);
    console.log(`>command: ${interaction.commandName}
        bot: ${interaction.user.bot}
        guild: ${guild}
        channel: ${interaction.channel}
        author: ${interaction.user}`);
    const role_perm = epeen.has(PermissionsBitField.Flags.ManageRoles);
    const kick_perm = epeen.has(PermissionsBitField.Flags.KickMembers);
    const kp = epeen.has(PermissionsBitField.Flags.Administrator);
    console.log(`    test: ${kp}\n    Role: ${role_perm}\n    Kick: ${kick_perm}`);

    try {
      guild.members.fetch(interaction.user.id).then(async m => {
        const hasRole = m.roles.cache.find(r => r.name == 'Bot Abuser');
        if (!hasRole) {
          await command.execute(client, interaction, epeen).catch(console.error);
        }
      });
    } catch (error) {
      console.error('Error during interaction', error);
      await interaction.reply({content: 'Whoops, something went wrong.', ephemeral: true}).catch(console.warn);
    }
  } else if(interaction.isButton()) {
    console.log(`>button: ${interaction.customId}`);
    // interaction.deferUpdate().then(console.log).catch(console.error);
    // interaction.fetchReply({content: 'Oops. Didn\'t finish that yet.'}).catch(console.error);
  }
};
