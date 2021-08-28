const path = require('path');
const math = require('mathjs');

const COMMAND_NAME = `${path.basename(__filename, '.js')} `;
const parser = math.parser();

exports.help = () => '2 + 2\n';

exports.run = (message) => {
  const { content } = message;
  const equation = content.split(COMMAND_NAME)[1];
  try {
    const result = parser.evaluate(equation.trim());
    message.channel.send(result.name || result.toString()).catch(console.error);
  } catch (e){
    if(e.message) message.channel.send(e.message).catch(console.error);
  }
  return;
};
