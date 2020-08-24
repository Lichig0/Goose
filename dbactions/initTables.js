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
    votes TEXT)
    `);

  db.run(`CREATE TABLE IF NOT EXISTS chatt (
    id INTEGER PRIMARY KEY,
    messageId TEXT NOT NULL,
    STRING TEXT NOT NULL,
    channelId TEXT NOT NULL,
    guildId TEXT NOT NULL)
    `);

  // close the database connection
  db.close((err) => {
    if (err) {
      return console.error(err.message);
    }
    console.log('Close the database connection.');
  });
};