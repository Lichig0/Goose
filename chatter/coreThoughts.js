const fs = require('fs');

exports.coreCorpus = {};
exports.raw = [];

exports.coreThoughts = (cb) => {
  fs.readFile('./chatter/ct.json', 'utf8', function (err, data) {
    if (err) {
      return console.log(err);
    }
    const coreThoughts = exports.raw = JSON.parse(data);
    if(coreThoughts instanceof Array) {
      coreThoughts.forEach((coreThought, index) => {
        exports.coreCorpus[`core${index}`] = {
          string: coreThought, id: `core${index}`, guild: 0, channel: 0, nsfw: false, attachments: {}
        };
      });
    }
    cb(exports.coreCorpus);
  });
  return exports.coreCorpus;
};
