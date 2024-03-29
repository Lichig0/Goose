const fs = require('fs');
exports.eggs = [];

exports.load = (callback) => {
  fs.readFile('./chatter/easterEggs.json', 'utf8', function(err, data) {
    if (err) {
      return console.error(err);
    }

    exports.eggs = JSON.parse(data);
    callback(exports.eggs);
  });
};
