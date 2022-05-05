const sqlite3 = require('sqlite3');

const DB_NAME = 'generalLocation';
const COLUMNS = {
  ID: 'id',
  USERID: 'userId',
  GUILDS: 'guilds',
  LON: 'lon',
  LAT: 'lat',
  NAME: 'name',
};

exports.init = (db, callback) => {
  db.run(`CREATE TABLE IF NOT EXISTS ${DB_NAME} (
    ${COLUMNS.ID} INTEGER PRIMARY KEY,
    ${COLUMNS.USERID} TEXT NOT NULL,
    ${COLUMNS.GUILDS} TEXT,
    ${COLUMNS.LON} TEXT,
    ${COLUMNS.LAT} TEXT,
    ${COLUMNS.NAME} TEXT,
    UNIQUE (${COLUMNS.USERID})
  )`);
  callback();
};

const onClose = (error) => {
  if (error) {
    return console.error(error);
  }
};

exports.add = (user, name, lon='', lat='',  guildsArray = [], callback = () => console.log('No callback set')) => {
  let db = new sqlite3.Database('goosedb.sqlite', (error) => {
    if (error) {
      return console.error(error);
    }
  });

  const userId = user.id ? user.id : user;
  db.run(`INSERT INTO ${DB_NAME} (${COLUMNS.USERID}, ${COLUMNS.GUILDS}, ${COLUMNS.LON}, ${COLUMNS.LAT}, ${COLUMNS.NAME})
  VALUES ($userId, $guilds, $lon, $lat, $name)
  ON CONFLICT (userId)
  DO UPDATE SET lon=$lon, lat=$lat, name=$name WHERE userId = $userId`,
  { $userId: userId, $guilds:`${guildsArray}`, $lon:lon, $lat:lat, $name:name }, (error) => {
    if (error) {
      return console.error(error.message);
    }
    console.log(`[Added Location] ${this.lastId}`);
  }, callback).close(onClose);
};

exports.get = (userId, callback) => {
  let db = new sqlite3.Database('goosedb.sqlite', (error) => {
    if (error) {
      return console.error(error);
    }
  });

  db.all(`SELECT ${COLUMNS.LON}, ${COLUMNS.LAT} , ${COLUMNS.NAME} FROM ${DB_NAME} WHERE userId = $userId`, {$userId: userId}, callback).close(onClose);
};

exports.asyncGet = (userId) => {
  return new Promise((resolve, reject) => {
    try {
      exports.get(userId, ((error, response = []) => {
        if(error) {
          return reject(error);

        }
        if(response.length === 0) {
          return reject('No locations found.');
        }
        const location = response[0];
        return resolve(location);

      }));
    } catch (e) {
      reject(e);
    }
  });
};
