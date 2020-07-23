const sqlite3 = require('sqlite3');

module.exports = (guilds) => {
  let db = new sqlite3.Database('goosedb.sqlite', (err) => {
    if (err) {
      return console.error(err.message);
    }
    console.log('Connected to the SQlite database.');
  });
  // Insults
  db.run(`CREATE TABLE IF NOT EXISTS insults (
    id INTEGER PRIMARY KEY,
    insult TEXT NOT NULL,
    author TEXT NOT NULL,
    guild TEXT NOT NULL)`);
  // "Dick"tionary
  db.run(`CREATE TABLE IF NOT EXISTS dicktionary (
    id INTEGER PRIMARY KEY,
    term TEXT NOT NULL,
    definition TEXT,
    author TEXT NOT NULL,
    guild TEXT NOT NULL)`);

  db.run(`CREATE TABLE IF NOT EXISTS userRoles (
    id INTEGER PRIMARY KEY,
    roles TEXT NOT NULL,
    member TEXT NOT NULL,
    guild TEXT NOT NULL)
    `);

  // close the database connection
  db.close((err) => {
    if (err) {
      return console.error(err.message);
    }
    console.log('Close the database connection.');
  });
}