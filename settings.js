const fs = require('fs');

exports.settings = {};

exports.loadConfig = async () => {
  await fs.readFile('settings.json', 'utf8', function (err, data) {
    if (err) {
      return console.log(err);
    }
    exports.settings = JSON.parse(data); // Should defaults be here or they are expected?
    console.log('[Settings refreshed]');
    return exports.settings;
  });
};
exports.setConfig = async newSettings => {
  if(newSettings) exports.settings = newSettings;
  await fs.writeFile('settings.json',JSON.stringify(exports.settings,null,2), (err) => {
    if (err) {
      console.error(err);
    }
    return;
  });
};

const autoReload = () => {
  exports.loadConfig();
  setTimeout(() => {
    autoReload();
  }, 60 * 1000 * 5);
};
autoReload();
