const chatter = require('../chatter/chatter');

module.exports = (client, guild) => {
  console.log(`[Joined guild] ${guild.name}`);
  chatter.addGuildBrain(guild).then((guildData) => {
    console.log('[Finished scraping.]', guildData.length);
  }).catch(console.error);
};
