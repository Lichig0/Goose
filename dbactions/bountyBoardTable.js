/*
id INTEGER PRIMARY KEY,
    assignee TEXT NOT NULL,
    game TEXT NOT NULL,
    requirement TEXT NOT NULL,
    reward REAL NOT NULL,
    optCondition TEXT,
    optReward REAL,
    status TEXT NOT NULL,
    guild TEXT NOT NULL)`
*/

const sqlite3 = require('sqlite3');

exports.init = (db) => {
  db.run(`CREATE TABLE IF NOT EXISTS bountyBoard (
    id INTEGER PRIMARY KEY,
    guid TEXT NOT NULL,
    gameName TEXT NOT NULL,
    assigneeId TEXT,
    authorId TEXT NOT NULL,
    condition TEXT NOT NULL,
    reward REAL NOT NULL,
    optCondition TEXT,
    optReward REAL,
    status INTEGER NOT NULL,
    postDate TEXT NOT NULL,
    expireDate TEXT,
    thumbUrl TEXT,
    proof BLOB,
    guild TEXT NOT NULL)`);
};

const onClose = (error) => {
  if (error) {
    return console.error(error);
  }
  console.log('Close the database connection.');
};

exports.get = (id, callback) => {
  let db = new sqlite3.Database('goosedb.sqlite', (err) => {
    if (err) {
      return console.error(err.message);
    }
  });
  const idInt = Number(id);
  if (!Number.isNaN(idInt)) {
    db.all('SELECT * FROM bountyBoard WHERE id = $id', { $id: idInt }, callback).close((err) => {
      if (err) {
        return console.error(err.message);
      }
    });
  } else {
    db.all('SELECT * FROM bountyBoard', callback).close((err) => {
      if (err) {
        return console.error(err.message);
      }
    });
  }
};

exports.like = (like, callback) => {
  let db = new sqlite3.Database('goosedb.sqlite', (err) => {
    if (err) {
      return console.error(err.message);
    }
  });
  if (!like) {
    return [];
  }
  const wildLike = `%${like}%`;
  db.all('SELECT * FROM bountyBoard WHERE gameName LIKE $like', { $like: wildLike }, callback).close((err) => {
    if (err) {
      return console.error(err.message);
    }
  });
};

exports.list = (callback) => {
  let db = new sqlite3.Database('goosedb.sqlite', (err) => {
    if (err) {
      return console.error(err.message);
    }
  });
  db.all('SELECT * FROM bountyBoard', callback).close((err) => {
    if (err) {
      return console.error(err.message);
    }
  });
};

exports.add = (game, message, commandOptions, callback) => {
  let db = new sqlite3.Database('goosedb.sqlite', (err) => {
    if (err) {
      return console.error(err.message);
    }
  });
  const { member, guild } = message;
  const {name, guid, image} = game;
  const [gameName, condition, reward, expires, optionalCondition, optionalReward] = commandOptions;

  db.run('SELECT * FROM bountyBoard WHERE guid = $guid', { $guid:guid }, (e, row) => {
    if(e) {
      return console.error(e);
    }

    if(row && row.length > 0) {
      console.log(`${guid}:${gameName} already exists.`);
      callback(row[0]);
    } else {
      const pDate = Date.now();
      db.run('INSERT INTO bountyBoard' +
      ' (guid, gameName, authorId, condition, reward, optCondition, optReward, status, postDate, expireDate, thumbUrl, guild)' +
      ' VALUES ($guid, $gameName, $member, $condition, $reward, $optCon, $optRew, $status, $pDate, $eDate, $thumb, $guild)',
      { $guid:guid, $gameName:name || gameName, $member:member, $condition:condition, $reward:reward, $optCon:optionalCondition, $optRew:optionalReward, $status:0, $pDate:pDate, $eDate:expires, $thumb:image.thumb_url, $guild:guild},
      function (err) {
        if (err) {
          return console.log(err.message);
        }
        // const id = this.lastID;
        callback(this.lastID, pDate);
        // get the last insert id
        console.log(`A row has been inserted with rowid ${this.lastID}`);
      });
    }

  }).close((err) => {
    if (err) {
      return console.error(err.message);
    }
    console.log('Close the database connection.');
  });
};

exports.assign = (bountyId, claimee, callback) => {
  let db = new sqlite3.Database('goosedb.sqlite', (err) => {
    if (err) {
      return console.error(err.message);
    }
  });
  db.serialize(() => {
    db.run('SELECT * FROM bountyBoard WHERE assigneeId = $claimee', { $claimee:claimee.toString()}, (e, row) => {
      if (e) return console.error(e);
      if (row && row.length > 0) return 0;
      db.run('UPDATE bountyBoard SET assigneeId = $claimee, status = $status WHERE id = $bountyId AND authorId != $claimee', { $bountyId: bountyId, $claimee: claimee, $status: 1 }, callback);
    });
  });
  db.close((e) => {
    if (e) console.error(e);
  });
};

exports.delete = (qid, author, callback) => {
  let db = new sqlite3.Database('goosedb.sqlite', (err) => {
    if (err) {
      return console.error(err.message);
    }
  });
  // delete from qdb where id=17 and author_id="<@166052926777851904>"
  db.run('DELETE FROM bountyBoard WHERE id=$id and author_id=$author', { $id: qid, $author: author }, callback).close(onClose);
};