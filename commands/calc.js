const path = require('path');
const math = require('mathjs');

const COMMAND_NAME = path.basename(__filename, '.js');

exports.help = () => 'Load the config (for chatter)\n';

exports.run = (message) => {
  const { content } = message;
  const equation = content.split(COMMAND_NAME)[1];
  message.channel.send(math.evaluate(equation)).catch(console.error);
  return;
};