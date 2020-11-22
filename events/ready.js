const chatter = require('../chatter/chatter');
module.exports = client => {
  console.log(`Logged in as ${client.user.tag}!`);
  chatter.init(client);
};