const { Permissions } = require('discord.js');
const userRolesTable = require('../dbactions/userRolesTable');
exports.help = () => '(Admin) memorize user roles. \n';
module.exports.run = (message, epeen) => {
  const admin_perm = epeen.has(Permissions.FLAGS.ADMINISTRATOR);
  const {guild, channel} = message;

  if (admin_perm) {
    const members = channel.members;
    userRolesTable.set(members.array(), guild.id);
    // members.array().forEach(member => {
    //   const roles =  member.roles.cache.array();
    // });
  }
  return;
};