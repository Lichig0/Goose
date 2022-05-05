const https = require('https');
const path = require('path');
const COMMAND_NAME = path.basename(__filename, '.js');

exports.getCommandData = () => {
  return {
    name: COMMAND_NAME,
    description: 'Google Google',
    options: [{
      name: 'input',
      type: 3,
      description: 'What to google',
      required: true,
    }],
  };
};

module.exports.execute = async (client, interaction) => {
  const input = interaction.options.get('input').value;
  const terms = input.split(' ').join('+');
  console.log(terms);
  const search = `https://www.google.com/search?q=${terms}`;
  let ifl = undefined;

  await interaction.deferReply().catch(console.warn);

  https.get(`${search}&btnI`, response => {
    const location = response.headers.location;
    if (location !== undefined) {
      ifl = response.headers.location.split('url?q=')[1];
    }
    const ret = ifl ? `${search} | ${ifl}` : search;
    console.log(ret);
    interaction.editReply({
      content: ret,
      ephemeral: false
    }).catch(console.error);
  });

};
