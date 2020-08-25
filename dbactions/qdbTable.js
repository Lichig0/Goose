const sqlite3 = require('sqlite3');
const fs = require('fs');

exports.get = (id, callback) => {
  let db = new sqlite3.Database('goosedb.sqlite', (err) => {
    if (err) {
      return console.error(err.message);
    }
  });
  const idInt = Number(id);
  if(!Number.isNaN(idInt)) {
    db.all('SELECT * FROM qdb WHERE id = $id',{$id:idInt}, callback).close((err) => {
      if (err) {
        return console.error(err.message);
      }
    });
  } else {
    db.all('SELECT * FROM qdb', callback).close((err) => {
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
  db.all('SELECT * FROM qdb WHERE tags OR body LIKE $like', {$like:wildLike}, callback).close((err) => {
    if (err) {
      return console.error(err.message);
    }
  });
};

exports.add = (newQuote, message) => {
  let db = new sqlite3.Database('goosedb.sqlite', (err) => {
    if (err) {
      return console.error(err.message);
    }
  });
  // const notes = '';
  // const tags = '';
  const score = '0';
  const votes = '0';
  db.run('INSERT INTO qdb' +
    ' (body, created, author_id, score, votes)' +
    ' VALUES ($body, $created, $author_id, $score, $votes)', { $body: newQuote, $created: Date(), $author_id: message.author.id, $score: score, $votes: votes }, function (err) {
    if (err) {
      return console.log(err.message);
    }
    // get the last insert id
    console.log(`A row has been inserted with rowid ${this.lastID}`);
  }).close((err) => {
    if (err) {
      return console.error(err.message);
    }
    console.log('Close the database connection.');
  });
};

exports.load = (filename = 'dbactions/qdb.json') => {
  let db = new sqlite3.Database('goosedb.sqlite', (err) => {
    if (err) {
      return console.error(err.message);
    }
  });

  fs.readFile(filename, 'utf8', function (err, data) {
    if (err) {
      return console.log(err);
    }
    let qdb = JSON.parse(data);

    data = qdb.filter(i => i.type === 'table')[0].data;
    db.serialize(()=> {
      db.parallelize(() => {
        data.forEach(row => {
          const { body, notes, tags, created, status, deleted, author_id, author_ip, score, votes } = row;
          db.run('INSERT INTO qdb' +
          ' (body, notes, tags, created, status, deleted, author_id, author_ip, score, votes)'+
          ' VALUES ($body, $notes, $tags, $created, $status, $deleted, $author_id, $author_ip, $score, $votes)',
          {$body:body, $notes:notes, $tags:tags, $created:created, $status: status, $deleted:deleted, $author_id:author_id, $author_ip:author_ip, $score:score, $votes:votes}, function (err) {
            if (err) {
              return console.log(err.message);
            }
            // get the last insert id
            console.log(`A row has been inserted with rowid ${this.lastID}`);
          });
        });
      });
      db.close((err) => {
        if (err) {
          return console.error(err.message);
        }
        console.log('Close the database connection.');
      });
    });
  });
};

