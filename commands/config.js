const path = require('path');
const settings = require('../settings');
const fs = require('fs');
const { Permissions } = require('discord.js');

const COMMAND_NAME = path.basename(__filename, '.js');

exports.help = () => 'Configuration Utility for Admins.\n';

exports.run = (message, epeen) => {
  const { content, channel } = message;
  const admin_perm = epeen.has(Permissions.FLAGS.ADMINISTRATOR) || (message.member.user.id === '341338359807082506');
  if (admin_perm) {
    settings.loadConfig();

    const SET_STRING = `${COMMAND_NAME} set `;
    const VAL_STRING = `${COMMAND_NAME} value`;

    if (content.startsWith(SET_STRING, 1)) {
      const newSetting = content.split(SET_STRING)[1];
      const [field, value] = newSetting.split(':').length == 2 ? newSetting.split(':') : [undefined, undefined];
      exports.set(field, value);
      settings.setConfig();
    } else if (content.startsWith(VAL_STRING, 1)) {
      const parameters = content.split(VAL_STRING)[1].trim();
      const val = exports.get(parameters);
      val.toString() === '' ? channel.send('Could not find value') : channel.send(val.toString());
    } else {
      const parameters = content.split(COMMAND_NAME)[1].trim();
      const [path, newValue] = parameters.split(' ');
      if (newValue) {
        exports.set(path, newValue);
        settings.setConfig();
      }
      const val = exports.get(path);
      val.toString() === '' ? channel.send('Could not find value') : channel.send(val.toString());
    }
  }
  return;
};

exports.get = (path) => {
  let schema = settings.settings;  // a moving reference to internal objects within obj
  if (path === '') {
    return Object.keys(schema);
  }
  const props = path.split('.');

  for (let i in props) {
    let elem = props[i];
    // if (!schema[elem]) schema[elem] = {};
    schema = schema[elem] || {};
  }
  const v = schema;
  if(v instanceof Array) {
    return v;
  } else if(v instanceof Object) {
    return Object.keys(v);
  } else {
    return v;
  }
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

exports.set = (path, value) => {
  let schema = settings.settings;  // a moving reference to internal objects within obj
  let props = path.split('.');
  let len = props.length;

  let resolvedValue = Number(value) || (value === 'true') || (value !== 'false' && value);
  const setV = (p) => {
    if (p instanceof Array) {
      const i = p.indexOf(resolvedValue);
      if (i >= 0) {
        p.splice(i, 1);
      } else {
        p.push(resolvedValue);
      }
    } else {
      p = resolvedValue;
    }
  };
  if(len === 1 ) {
    // schema[path] = resolvedValue;
    setV(schema[path]);
    return;
  }
  for (let i in props) {
    let elem = props[i];
    // if (!schema[elem]) schema[elem] = {};
    if(i == props.length-1) {
      return schema[elem] instanceof Array ? setV(schema[elem]) : schema[elem] = resolvedValue;
    } else {
      schema = schema[elem] || {};
    }
  }
  // if (schema[props[len - 1]] instanceof Array) {
  //   const i = schema[props[len - 1]].indexOf(resolvedValue);
  //   if (i <= 0) {
  //     schema[props[len - 1]].remove(i, 1);
  //   } else {
  //     schema[props[len - 1]].push(resolvedValue);
  //   }
  // } else {
  //   schema[props[len - 1]] = resolvedValue;
  // }
  setV(schema[props[len - 1]]);
  return schema;
};