const chatter = require('../chatter/chatter');

module.exports = (client, message) => {
  console.log('[Message event]');
  const {author, guild} = message;
  const optedOutIds = client.optedOutUsers.map(({userId}) => userId);
  if(!guild) return;
  if(optedOutIds.includes(author.id)) return;

  if (guild) {
    try {
      chatter.run(message, client).catch(console.error);
    } catch (e) {
      console.error('Error in chatter', e);
    }
  }
};
