const sqlite3 = require('sqlite3');

exports.init = (db, callback) => {
  // Insults
  db.run(`CREATE TABLE IF NOT EXISTS insults (
      id INTEGER PRIMARY KEY,
      insult TEXT NOT NULL,
      author TEXT NOT NULL,
      guild TEXT NOT NULL)`);
  callback();
};

exports.insert = (insult, author, guild, callback) => {
  let db = new sqlite3.Database('goosedb.sqlite', (err) => {
    if (err) {
      return console.error(err.message);
    }
    console.log('Connected to the SQlite database.');
  });


  db.run('INSERT INTO insults (insult, author, guild) VALUES (?,?,?);', [insult, author, guild], function (err) {
    callback(err);
    if (err) {
      return console.log(err.message);
    }
    // get the last insert id
    console.log(`A row has been inserted with rowid ${this.lastID}`);
  }).close((err) => {
    if (err) {
      return console.error(err.message);
    }
  });
};

exports.get = (guild, callback) => {
  let db = new sqlite3.Database('goosedb.sqlite', (err) => {
    if (err) {
      return console.error(err.message);
    }
  });


  db.all('SELECT insult FROM insults WHERE guild IS (?)',[guild], (err) => {
    if (err) {
      return console.log(err);
    }
  },callback).close((err) => {
    if (err) {
      return console.error(err.message);
    }
  });
};