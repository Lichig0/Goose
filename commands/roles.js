const { Permissions } = require('discord.js');
const userRolesTable = require('../dbactions/userRolesTable');
exports.help = () => '(Admin) memorize user roles. \n';
module.exports.run = (message, epeen) => {
  const admin_perm = epeen.has(Permissions.FLAGS.ADMINISTRATOR);
  const {guild, channel, mentions} = message;

  if (admin_perm) {
    const members = channel.members;
    const member = mentions.members.first();
    if(member && message.content.includes('get')){
      userRolesTable.get(member,(err, roles)=>{
        console.log(roles.first().roles.split(','));
      });
    } else {
      userRolesTable.set(members.array(), guild.id);
    }
  }
  return;
};