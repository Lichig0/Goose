const userRolesTable = require('../dbactions/userRolesTable');

module.exports = (client, oldMember, newMember) => {
  userRolesTable.get(newMember, (err, rolesString) => {
    // Everyone should have @everyone if they were seen before....
    if(rolesString && rolesString.length === 0) {
      userRolesTable.set(newMember, newMember.guild.id).catch(console.error);
    }
    else if (rolesString && rolesString.length > 0) {
      const roles = newMember.roles.cache.filter(r => !r.managed).flatMap(r => r.id);
      const rolesArray = [...roles.values()];
      console.log(newMember.name, rolesArray.map(role=> role.name));
      if (rolesArray.lenght > 0 ) userRolesTable.update(newMember, roles.rolesArray).catch(console.error);
    }
  });
};
