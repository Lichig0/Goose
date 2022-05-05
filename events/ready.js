const chatter = require('../chatter/chatter');
const optOutTable = require('../dbactions/optOutTable');
module.exports = client => {
  console.log(`Logged in as ${client.user.tag}!`);
  process.title = client.user.tag;
  client.owner = process.env.OWNER;
  client.users.fetch(`${client.owner}`).then(user => {
    user.createDM().then(dmChannel => {
      dmChannel.send(`${client.user.tag} has started.`);
    }).catch(console.error);
  }).catch(console.error);
  optOutTable.get((err, ids) => {
    if(err) {
      console.warn('[OptOut]', err.message);
    }
    client.optedOutUsers = ids;
    console.log('[OptOut]', client.optedOutUsers);
    chatter.init(client);
  });
};
