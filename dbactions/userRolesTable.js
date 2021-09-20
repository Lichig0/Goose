const sqlite3 = require('sqlite3');

exports.init = (db, callback) => {
  db.run(`CREATE TABLE IF NOT EXISTS userRoles (
    id INTEGER PRIMARY KEY,
    roles TEXT NOT NULL,
    member TEXT NOT NULL,
    guild TEXT NOT NULL,
    UNIQUE (member, guild))
  `);
  callback();
};

exports.set = (members, guildId, callback) => {
  let db = new sqlite3.Database('goosedb.sqlite', (err) => {
    if (err) {
      return console.error(err.message);
    }
  });

  if(!Array.isArray(members)) {
    members = [members];
  }
  db.serialize(() => {
    db.parallelize(() => {
      members.forEach(member => {
        const roles = member.roles.cache.filter(r=>!r.managed).map(r=>r.id);
        if(roles.size <= 1) return console.warn(`${member.name} only has ${roles.size}`);
        const rolesArray = [...roles.values()];
        db.run('INSERT INTO userRoles (roles, member, guild) VALUES ($roles,$member,$guildId) ON CONFLICT (member,guild) DO UPDATE SET roles=$roles WHERE member = $member AND guild=$guildId',
          {$roles:`${rolesArray}`, $member:member.id, $guildId:guildId}, function (err) {
            if (err) {
              return console.log(err.message);
            }
            // get the last insert id
            console.log(`A row has been inserted with rowid ${this.lastID}`);
          },callback);
      });
    });
    db.close((err) => {
      if (err) {
        return console.error(err.message);
      }
    });
  });
};

exports.update = (member, roles, callback) => {
  let db = new sqlite3.Database('goosedb.sqlite', (err) => {
    if (err) {
      return console.error(err.message);
    }
  });
  db.run('UPDATE userRoles SET roles = $roles WHERE guild = $guild AND member = $member',
    {$member:member.id,$guild:member.guild.id,$roles:`${roles}`}, callback);
};

exports.get = (member, callback) => {
  let db = new sqlite3.Database('goosedb.sqlite', (err) => {
    if (err) {
      return console.error(err.message);
    }
  });

  const {guild} = member;
  db.all('SELECT roles FROM userRoles WHERE guild = $guild AND member = $member', {$guild:guild.id, $member:member.id}, callback);

};
