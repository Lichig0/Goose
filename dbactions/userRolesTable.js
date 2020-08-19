const sqlite3 = require('sqlite3');

exports.set = (members, guildId, callback) => {
  let db = new sqlite3.Database('goosedb.sqlite', (err) => {
    if (err) {
      return console.error(err.message);
    }
  });

  if(!Array.isArray(members)) {
    members = [members];
  }
  members.forEach(member => {
    const roles = member.roles.cache.array();
    db.run('INSERT INTO userRoles (roles, member, guild) VALUES (?,?,?) ON CONFLICT (member) AND (guild) DO UPDATE SET member = (?) and guild = (?)', [roles, member, guildId, member, guildId], function (err) {
      if (err) {
        return console.log(err.message);
      }
      // get the last insert id
      console.log(`A row has been inserted with rowid ${this.lastID}`);
    });
  });

  db.close((err) => {
    if (err) {
      return console.error(err.message);
    }
  });
};

exports.update = (member, roles, callback) => {
  // UPDATE INSULTS
  // SET insult = "{member} is a dick muncher"
  // WHERE insult IS "{!user} is a dick muncher";
  db.run('UPDATE userRoles SET roles = (?) WHERE member = (?) AND guild = (?)', [roles, member.id, member.guild.id]);
};

exports.get = (member, callback) => {
  let db = new sqlite3.Database('goosedb.sqlite', (err) => {
    if (err) {
      return console.error(err.message);
    }
  });
  const {guild} = member;
  db.all('SELECT roles FROM userRoles WHERE guild IS (?) AND user is (?)', [guild.id, member.id],(err) => {
    if(err) {
      return console.error(err);
    }
  }, callback).close((err) => {
    if (err) return console.error(err);
  });

};