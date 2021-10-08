const sqlite3 = require('sqlite3');

exports.init = (db, callback) => {
  db.run(`CREATE TABLE IF NOT EXISTS optOut (
    id INTEGER PRIMARY KEY,
    userId TEXT NOT NULL,
    guilds TEXT,
    UNIQUE (userId))
  `);
  callback();
};

exports.add = (user, guildsArray = [], callback) => {
  let db = new sqlite3.Database('goosedb.sqlite', (error) => {
    if (error) {
      return console.error(error);
    }
  });
  const userId = user.id ? user.id : user;
  db.run('INSERT INTO optOut (userId, guilds) VALUES ($userId, $guilds) ON CONFLICT (userId) DO UPDATE SET guilds=$guilds WHERE userId = $userId',
    {$userId: userId, $guilds:`${guildsArray}`}, (error) => {
      if (error) {
        return console.error(error.message);
      }
      console.log(`[Added OptOut] ${this.lastID}`);
    }, callback);
};

exports.remove = (user, callback) => {
  let db = new sqlite3.Database('goosedb.sqlite', (error) => {
    if (error) {
      return console.error(error);
    }
  });
  const userId = user.id ? user.id : user;
  db.run('DELETE FROM optOut WHERE userId = $userId',
    {$userId: userId}, (error) => {
      if (error) {
        return console.error(error.message);
      }
      console.log(`[Removed OptOut] ${this}`);
    }, callback);
};

exports.get = (callback) => {
  let db = new sqlite3.Database('goosedb.sqlite', (error) => {
    if (error) {
      return console.error(error);
    }
  });

  db.all('SELECT userId from optOut', (error) => {
    if (error) {
      return console.error(error.message);
    }
  }, callback).close((error) => {
    if (error) {
      return console.error(error.message);
    }
  });
};
