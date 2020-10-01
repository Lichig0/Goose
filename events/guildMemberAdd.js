const userRolesTable = require('../dbactions/userRolesTable');

module.exports = (client, member) => {
  console.log(`${member} joined.`);
  userRolesTable.get(member, (err, rolesString) => {
    if(rolesString && rolesString.length > 0)
    {
      const roles = rolesString[0].roles.split(',');
      const foundRoles = [];
      roles.forEach(role => {
        const gr = member.guild.roles.cache.get(role);
        if(gr) {
          foundRoles.push(gr);
        }
      });
      member.roles.add(foundRoles).catch((e) => {
        console.error('[Failed to add role.]',e);
      });
    }
  });
  member.createDM().catch(e=>{
    console.error('[Could not open DM]',e);
  });
};