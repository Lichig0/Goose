const chatter = require('../chatter/chatter');

module.exports = (client, message) => {
  const {author, guild} = message;
  const optedOutIds = client.optedOutUsers.map(({userId}) => userId);
  if(!guild) return;
  if(optedOutIds.includes(author.id)) return;

  if (guild) {
    chatter.run(message, client).then(() => console.log('[Chatter Run]')).catch(console.error);
  }
};
