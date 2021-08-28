const Chance = require('chance');
const chance = new Chance();
const path = require('path');
const COMMAND_NAME = path.basename(__filename, '.js');
module.exports.help = () => { 'Emote.'; };

module.exports.run = (message) => {
  const toSay = chance.bool({ likelihood: 90 });
  const { client, channel } = message;
  if (toSay) {
    channel.send(client.emojis.cache.random().toString()).catch(console.error);
  } else {
    message.react(client.emojis.cache.random().id).catch(console.error);
  }
};

module.exports.getCommandData = () => {
  return {
    name: COMMAND_NAME,
    description: 'Emote.',
  };
};

module.exports.execute = async (client, interaction) => {
  return interaction.reply(client.emojis.cache.random().toString()).catch(console.error);
};
