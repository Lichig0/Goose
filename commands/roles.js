const { Permissions } = require('discord.js');
const userRolesTable = require('../dbactions/userRolesTable');
const path = require('path');
const COMMAND_NAME = path.basename(__filename, '.js');
exports.help = () => '(Admin) memorize user roles. \n';
module.exports.run = (message, epeen) => {
  const admin_perm = epeen.has(Permissions.FLAGS.ADMINISTRATOR);
  const {guild, mentions} = message;

  if (admin_perm) {
    const member = mentions.members.first();
    if(member && message.content.includes('get')){
      userRolesTable.get(member,(err, roles)=>{
        console.log(roles.first().roles.split(','));
      });
    } else {
      guild.members.fetch().then(members => {
        userRolesTable.set([...members.values()], guild.id);
      });
    }
  }
  return;
};

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
  return interaction.editReply('Done.');
};
module.exports.dev = false;
