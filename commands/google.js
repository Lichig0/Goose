const https = require('https');
const path = require('path');
const COMMAND_NAME = path.basename(__filename, '.js');

module.exports.run = message => {
  const { channel, content } = message;
  const terms = content.split(' ').slice(1).join('+');
  const search = `https://www.google.com/search?q=${terms}`;
  // const search = `https://customsearch.googleapis.com/customsearch/v1?q=${terms}key=${process.env.GOOGLE_API_KEY}`
  console.log(search);
  let ifl = undefined;
  https.get(`${search}&btnI`, response => {
    // console.log(response.headers);
    const location = response.headers.location;
    if (location !== undefined) {
      ifl = response.headers.location.split('url?q=')[1];
      // channel.send(ifl);
    }
    ifl ? channel.send(`${search} | ${ifl}`) : channel.send(search);
  });
};
exports.help = () => 'Google something\n';

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

  await interaction.deferReply();

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
    });
  });

};
