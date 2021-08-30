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
    attachmentUrl TEXT)
    `);
  callback();
};

exports.get = (id, callback) => {
  let db = new sqlite3.Database('goosedb.sqlite', (err) => {
    if (err) {
      return console.error(err.message);
    }
  });
  const idInt = Number(id);
  if(!Number.isNaN(idInt)) {
    db.all('SELECT * FROM qdb WHERE id = $id',{$id:idInt}, callback).close(onClose);
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
  db.all('SELECT * FROM qdb WHERE body LIKE $like', {$like:wildLike}, callback).close(onClose);
};

exports.delete = (qid, author, callback) => {
  let db = new sqlite3.Database('goosedb.sqlite', (err) => {
    if (err) {
      return console.error(err.message);
    }
  });
  // delete from qdb where id=17 and author_id="<@166052926777851904>"
  db.run('DELETE FROM qdb WHERE id=$id and (author_id=$author OR author_id is null)', {$id:qid, $author:author}, callback).close(onClose);
};

exports.vote= (qid, score, votes, callback) => {
  let db = new sqlite3.Database('goosedb.sqlite', (err) => {
    if (err) {
      return console.error(err.message);
    }
  });

  db.run('UPDATE qdb set score=$score, votes=$votes WHERE id=$id', {$score:score, $votes:votes, $id:qid}, callback).close(onClose);
};

exports.add = (newQuote, message, callback, attachmentUrl, blob = Buffer.from([]).toString('base64')) => {
  let db = new sqlite3.Database('goosedb.sqlite', (err) => {
    if (err) {
      return console.error(err.message);
    }
  });
  // const notes = '';
  // const tags = '';
  const score = '0';
  const votes = '0';
  const messageUser = message.user ? message.user : message.author;
  db.run('INSERT INTO qdb' +
    ' (body, created, author_id, score, votes, attachment, attachmentUrl)' +
    ' VALUES ($body, $created, $author_id, $score, $votes, $blob, $au)', { $body: newQuote, $created: Date(), $author_id: messageUser, $score: score, $votes: votes, $blob:blob, $au:attachmentUrl }, function (err) {
    if (err) {
      return console.log(err.message);
    }
    // get the last insert id
    console.log(`A row has been inserted with rowid ${this.lastID}`);
    callback(this);
  }).close(onClose);
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
      db.close(onClose);
    });
  });
};
