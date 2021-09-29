const sqlite3 = require('sqlite3');
const fs = require('fs');


const dbTables = {};
module.exports = () => {
  let db = new sqlite3.Database('goosedb.sqlite', (err) => {
    if (err) {
      return console.error(err.message);
    }
    console.log('[DB] Connected to the SQlite database.');
  });

  fs.readdir('./dbactions', (err, files) => {
    if(err) {
      closeDb();
      console.log(err);
    }
    files.forEach(file => {
      if(`${__dirname}/${file}` !== __filename) {
        const dbTable = file.split('.')[0];
        const dbt = dbTables[dbTable] = require(`./${file}`);
        if(dbt.init) {
          dbTables[dbTable].init(db, () => {
            console.log(`[DB] Initialized ${dbTable}`);
          });
        } else {
          console.warn(`[DB] ${dbTable} does not have init`);
        }
      }
    });
    closeDb();
  });

  const closeDb = () => {
    // close the database connection
    db.close((err) => {
      if (err) {
        return console.error(err.message);
      }
      console.log('[DB] Close the database connection.');
    });
  };

  // "Dick"tionary
  // db.run(`CREATE TABLE IF NOT EXISTS dicktionary (
  //   id INTEGER PRIMARY KEY,
  //   term TEXT NOT NULL,
  //   definition TEXT,
  //   author TEXT NOT NULL,
  //   guild TEXT NOT NULL)`);

  // db.run(`CREATE TABLE IF NOT EXISTS wiki (
  //   id INTEGER PRIMARY KEY,
  //   term TEXT NOT NULL,
  //   definition TEXT,
  //   author TEXT NOT NULL,
  //   guild TEXT NOT NULL)`);
};
