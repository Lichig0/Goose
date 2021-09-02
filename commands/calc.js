const path = require('path');
const math = require('mathjs');
const {Constants: {ApplicationCommandOptionTypes}} = require('discord.js');

const COMMAND_NAME = `${path.basename(__filename, '.js')} `;
const parser = math.parser();

exports.getCommandData = () => {
  return {
    name: COMMAND_NAME,
    description: 'Maths',
    options: [
      {
        name: 'input',
        description: 'Equation here',
        type: ApplicationCommandOptionTypes.STRING,
        required: true
      }
    ],
  };
};

exports.execute = async (client, interaction) => {
  const equation = interaction.options.get('input').value;
  await interaction.deferReply();
  try {
    const result = parser.evaluate(equation.trim());
    interaction.editReply(result.name || result.toString()).catch(console.error);
  } catch (e){
    if(e.message) interaction.editReply(e.message).catch(console.error);
  }
  return;
};

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

exports.dev = false;
