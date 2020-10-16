const userRolesTable = require('../dbactions/userRolesTable');

module.exports = (client, oldMember, newMember) => {
  userRolesTable.get(newMember, (err, rolesString) => {
    // Everyone should have @everyone if they were seen before....
    if(rolesString && rolesString.length === 0) {
      userRolesTable.set(newMember, newMember.guild.id);
    }
    else if (rolesString && rolesString.length > 0) {
      const roles = newMember.roles.cache.array().flatMap(r => r.id);
      userRolesTable.update(newMember, roles);
    }
  });
};