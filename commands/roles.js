const { Permissions } = require('discord.js');
const userRolesTable = require('../dbactions/userRolesTable');
const path = require('path');
const COMMAND_NAME = path.basename(__filename, '.js');

module.exports.getCommandData = () => {
  return {
    name: COMMAND_NAME,
    description: 'Admin Util: collect current roles for all users.',
    default_permission: false,
    ephemeral: true,
  };
};

module.exports.execute = async (client, interaction, epeen) => {
  const admin_perm = epeen.has(Permissions.FLAGS.ADMINISTRATOR);
  const {guild} = interaction;
  await interaction.deferReply();
  if (admin_perm) {
    guild.members.fetch().then(members => {
      userRolesTable.set([...members.values()], guild.id);
    });
  }
  return interaction.editReply('Done.').catch(console.error);
};
module.exports.dev = false;
