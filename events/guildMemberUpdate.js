const userRolesTable = require('../dbactions/userRolesTable');

module.exports = (client, oldMember, newMember) => {
  console.log('[Member Update]');
  const roles = newMember.roles.cache.filter(r => !r.managed).map(r => r.id);
  const rolesArray = [...roles.values()];
  userRolesTable.get(newMember, (err, rolesString) => {
    if(rolesString && rolesString.length === 0 && rolesArray.length > 0) {
      try {
        userRolesTable.set(newMember, newMember.guild.id);
      } catch (e) {
        console.error(e);
      }
    }
    else if (rolesString && rolesString.length > 0) {
      const roles = newMember.roles.cache.filter(r => !r.managed).map(r => r.id);
      console.log(newMember.name, roles);
      if (roles.length > 0 ) {
        try {
          userRolesTable.update(newMember, roles)?.catch(console.error);
        } catch (e) {
          console.error(e);
        }
      }
    }
  });
};
