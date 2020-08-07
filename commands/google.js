const https = require('https');

module.exports.run = message => {
  const { author, channel, content } = message
  const terms = content.split(' ').slice(1).join('+');
  const search = `https://www.google.com/search?q=${terms}`
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
  })
}
exports.help = () => `Google something\n`;