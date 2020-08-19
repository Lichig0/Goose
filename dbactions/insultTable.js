const sqlite3 = require('sqlite3');

exports.insert = (insult, author, guild) => {
  let db = new sqlite3.Database('goosedb.sqlite', (err) => {
    if (err) {
      return console.error(err.message);
    }
    console.log('Connected to the SQlite database.');
  });


  db.run('INSERT INTO insults (insult, author, guild) VALUES (?,?,?);', [insult, author, guild], function (err) {
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