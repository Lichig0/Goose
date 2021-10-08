const chatter = require('../chatter/chatter');
const optOutTable = require('../dbactions/optOutTable');
module.exports = client => {
  console.log(`Logged in as ${client.user.tag}!`);
  optOutTable.get((err, ids) => {
    if(err) {
      console.warn('[OptOut]', err.message);
    }
    client.optedOutUsers = ids;
    console.log('[OptOut]', client.optedOutUsers);
    chatter.init(client);
  });
};
