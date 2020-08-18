const path = require('path');
const settings = require('../settings');
const fs = require('fs');
const { Permissions } = require('discord.js');

const COMMAND_NAME = path.basename(__filename, '.js');

exports.help = () => 'Load the config (for chatter)\n';

exports.run = (message, epeen) => {
  const { content } = message;
  const admin_perm = epeen.has(Permissions.FLAGS.ADMINISTRATOR) || (message.member.user.id === '341338359807082506');
  if (admin_perm) {
    settings.loadConfig();

    const SET_STRING = `${COMMAND_NAME} set `;
    if (content.startsWith(SET_STRING, 1)) {
      const newSetting = content.split(SET_STRING)[1];
      const [field, value] = newSetting.split(':').length == 2 ? newSetting.split(':') : [undefined, undefined];
      set(field, value);
      settings.setConfig();
    }
  }
  return;
};

exports.loadConfig = () => {
  fs.readFile('settings.json', 'utf8', function (err, data) {
    if (err) {
      return console.log(err);
    }
    exports.settings = JSON.parse(data);
  });
};
exports.loadConfig();

function set(path, value) {
  let schema = settings.settings;  // a moving reference to internal objects within obj
  let props = path.split('.');
  let len = props.length;

  let resolvedValue = Number(value) || (value === 'true') || (value !== 'false' && value);
  if(len === 1 ) {
    schema[path] = resolvedValue;
    return;
  }
  for (let i in props) {
    let elem = props[i];
    if (!schema[elem]) schema[elem] = {};
    schema = schema[elem];
  }
  schema[props[len - 1]] = resolvedValue;
  return schema;
}