const path = require('path');
const optOutTable = require('../dbactions/optOutTable');
const { Constants: { ApplicationCommandTypes, ApplicationCommandOptionTypes } } = require('discord.js');
const COMMAND_NAME = path.basename(__filename, '.js');


module.exports.getCommandData = () => {
  return {
    type: ApplicationCommandTypes.CHAT_INPUT,
    name: COMMAND_NAME,
    description: 'OptOut from having furutre messages collected on events and corpus rebuilds.',
    default_permission: true,
    options: [
      {
        name: 'optout',
        type: ApplicationCommandOptionTypes.BOOLEAN,
        description: '(Default: True) True to opt out, False to opt back in',
        required: false
      }
    ]
  };
};

module.exports.execute = async (client, interaction) => {
  const { member } = interaction;
  // await interaction.reply('Whoops, I don\'t know what that means yet.');
  // return;
  await interaction.deferReply();


  const toOptOut = interaction.options.get('optout')?.value ?? true;
  if(!toOptOut) {
    optOutTable.remove(member.id, () => {
      optOutTable.get((err, ids) => {
        console.log('[OptOut]', ids);
        client.optedOutUsers = ids;
      });
      interaction.editReply('Always took you as an egomaniac.');
    });
  } else {
    optOutTable.add(member.id, [], () => {
      optOutTable.get((err, ids) => {
        console.log('[OptOut]', ids);
        client.optedOutUsers = ids;
      });
      interaction.editReply('You were always dead to me anyways.');
    });
  }
  return;
};

module.exports.getOptedOut = (callback) => {
  optOutTable.get((error, value) => {
    if(error) {
      console.error('[DB]', error.message);
    }
    callback(value);
  });
  return;
};

module.exports.dev = false;
