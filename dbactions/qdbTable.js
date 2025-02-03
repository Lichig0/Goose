const sqlite3 = require('sqlite3');
const fs = require('fs');


const onClose = (error) => {
  if(error) {
    return console.error(error);
  }
  console.log('Close the database connection.');
};

exports.init = (db, callback) => {
  db.run(`CREATE TABLE IF NOT EXISTS qdb (
    id INTEGER PRIMARY KEY,
    body TEXT,
    notes TEXT,
    tags TEXT,
    created TEXT,
    status TEXT,
    deleted TEXT,
    author_id TEXT,
    author_ip TEXT,
    score TEXT,
    votes TEXT,
    attachment BLOB,
    attachmentUrl TEXT,
    guild TEXT NOT NULL)
    `);
  callback();
};

exports.get = (id, guild) => {
  return new Promise((resolve, reject) => {
    const guildId = guild.id ? guild.id : guild;
    const db = new sqlite3.Database('goosedb.sqlite', (err) => {
      if (err) {
        return reject(err.message);
      }
    });
    const idInt = Number(id);
    if(!Number.isNaN(idInt)) {
      db.all('SELECT * FROM qdb WHERE id = $id AND guild = $guild',{$id:idInt, $guild:guildId}, (err, rows) => {
        err ? reject(err) : resolve(rows);
      }).close(onClose);
    } else {
      db.all('SELECT * FROM qdb', resolve).close(onClose);
    }
  });
};

exports.like = (like, guild) => {
  return new Promise((resolve, reject) => {
    const guildId = guild.id ? guild.id : guild;
    const db = new sqlite3.Database('goosedb.sqlite', (err) => {
      if (err) {
        return reject(err.message);
      }
    });
    if (!like) {
      return [];
    }
    const wildLike = `%${like}%`;
    db.all('SELECT * FROM qdb WHERE (body LIKE $like OR tags LIKE $like2 OR notes LIKE $like3) AND guild = $guild',
      { $like:wildLike, $like2:wildLike, $like3:wildLike, $guild:guildId}, 
      (err, rows) => {
        err ? reject(err) : resolve(rows);
      }).close(onClose);
  });
};

exports.delete = (qid, author) => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database('goosedb.sqlite', (err) => {
      if (err) {
        return reject(err.message);
      }
    });
    db.run('DELETE FROM qdb WHERE id=$id and (author_id=$author OR author_id is null)', {$id:qid, $author:`${author}`}, (err, rows) => {
      err ? reject(err) : resolve(rows);
    }).close(onClose);
  });
};

exports.vote = (qid, score, votes) => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database('goosedb.sqlite', (err) => {
      if (err) {
        return reject(err.message);
      }
    });
  
    db.run('UPDATE qdb set score=$score, votes=$votes WHERE id=$id', {$score:score, $votes:votes, $id:qid}, (err, rows) => {
      err ? reject(err) : resolve(rows);
    }).close(onClose);
  });
};

exports.add = (newQuote, message, options) => {
  return new Promise((resolve, reject) => {
    const {attachmentUrl, blob = Buffer.from([]).toString('base64'), tags, notes} = options;
    const db = new sqlite3.Database('goosedb.sqlite', (err) => {
      if (err) {
        reject(err.message);
      }
    });
    // const notes = '';
    // const tags = '';
    const score = '0';
    const votes = '0';
    const messageUserId = message.user ? `${message.user}` : message.author.id;
    const guildId = message.guild.id;
    db.run('INSERT INTO qdb' +
      ' (body, notes, tags, created, author_id, guild, score, votes, attachment, attachmentUrl)' +
      ' VALUES ($body, $notes, $tags, $created, $author_id, $guild, $score, $votes, $blob, $au)', 
    { $body: newQuote, $notes:notes, $tags:tags, $created: Date(), $author_id: messageUserId, $guild: guildId, $score: score, $votes: votes, $blob:blob, $au:attachmentUrl },
    function (err) {
      if (err) {
        reject(err.message);
      }
      // get the last insert id
      console.log(`A row has been inserted with rowid ${this.lastID}`);
      resolve({...this, guildId});
    }).close(onClose);
  });
};

exports.load = (filename = 'dbactions/qdb.json', guild='12345678987654321') => {
  const guildId = guild.id ? guild.id : guild;
  const db = new sqlite3.Database('goosedb.sqlite', (err) => {
    if (err) {
      return console.error(err.message);
    }
  });

  fs.readFile(filename, 'utf8', function (err, data) {
    if (err) {
      return console.log(err);
    }
    const qdb = JSON.parse(data);

    data = qdb.filter(i => i.type === 'table')[0].data;
    db.serialize(()=> {
      db.parallelize(() => {
        data.forEach(row => {
          const { body, notes, tags, created, status, deleted, author_id, author_ip, score, votes } = row;
          db.run('INSERT INTO qdb' +
          ' (body, notes, tags, created, status, deleted, author_id, author_ip, guild, score, votes)'+
          ' VALUES ($body, $notes, $tags, $created, $status, $deleted, $author_id, $author_ip, $score, $votes)',
          {$body:body, $notes:notes, $tags:tags, $created:created, $status: status, $deleted:deleted, $author_id:author_id, $author_ip:author_ip, $guild:guildId, $score:score, $votes:votes}, function (err) {
            if (err) {
              return console.log(err.message);
            }
            // get the last insert id
            console.log(`A row has been inserted with rowid ${this.lastID}`);
          });
        });
      });
      db.close(onClose);
    });
  });
};
