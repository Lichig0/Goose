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
  db.serialize(() => {
    db.parallelize(() => {
      members.forEach(member => {
        const roles = member.roles.cache.array().filter(r=>!r.managed).flatMap(r=>r.id);
        // const id = member.id.toString()&guildId.toString();
        db.run('INSERT INTO userRoles (roles, member, guild) VALUES ($roles,$member,$guildId) ON CONFLICT (member,guild) DO UPDATE SET roles=$roles WHERE member = $member',
          {$roles:roles, $member:member, $guildId:guildId}, function (err) {
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
  // const id = member.id&member.guild.id;
  db.run('UPDATE userRoles SET roles = $roles WHERE guild = $guild AND member = $member',
    {$member:member,$guild:member.guild.id,$roles:roles}, callback);
};

exports.get = (member, callback) => {
  let db = new sqlite3.Database('goosedb.sqlite', (err) => {
    if (err) {
      return console.error(err.message);
    }
  });

  const {guild} = member;
  db.all('SELECT roles FROM userRoles WHERE guild = $guild AND member = $member', {$guild:guild.id, $member:member},callback);

};