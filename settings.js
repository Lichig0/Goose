const fs = require('fs');

exports.settings = {};

exports.loadConfig = () => {
  fs.readFile('settings.json', 'utf8', function (err, data) {
    if (err) {
      return console.log(err);
    }
    exports.settings = JSON.parse(data); // Should defaults be here or they are expexted?
  });
};
exports.setConfig = newSettings => {
  if(newSettings) exports.settings = newSettings;
  fs.writeFile('settings.json',JSON.stringify(exports.settings,' '), (err) => {
    if (err) {
      console.error(err);
    }
    return;
  });
};
exports.loadConfig();
