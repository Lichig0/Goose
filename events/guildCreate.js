const chatter = require('../chatter/chatter');

module.exports = (client, guild) => {
  console.log(`[Joined guild] ${guild.name}`);
  client.owner = process.env.OWNER;
  client.users.fetch(`${client.owner}`).then(user => {
    user.createDM().then(dmChannel => {
      dmChannel.send(`${client.user.tag} has joined ${guild.name}.`);
    }).catch(console.error);
  }).catch(console.error);
  chatter.addGuildBrain(guild).then((guildData) => {
    console.log('[Finished scraping.]', guildData.length);
  }).catch(console.error);
};
