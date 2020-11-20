const fs = require('fs');

exports.coreCorpus = {};

exports.coreThoughts = (cb) => {
  fs.readFile('./chatter/ct.json', 'utf8', function (err, data) {
    if (err) {
      return console.log(err);
    }
    const coreThoughts = JSON.parse(data);
    if(coreThoughts instanceof Array) {
      coreThoughts.forEach((coreThought, index) => {
        exports.coreCorpus[`core${index}`] = {
          string: coreThought, id: `core${index}`, guild: 0, channel: 0, attachments: {}
        };
      });
    }
    cb(exports.coreCorpus);
  });
  return exports.coreCorpus;
};