const chatter = require('../chatter/chatter');
const optOutTable = require('../dbactions/optOutTable');
const { startServer } = require('../settingsServer/server');

module.exports = async (client) => {
  console.log(`Logged in as ${client.user.tag}!`);
  process.title = client.user.tag;
  client.owner = process.env.OWNER;

  try {
    // Start the settings server
    await startServer();
    console.log('Settings server started successfully');
  } catch (error) {
    console.error('Failed to start settings server:', error);
  }

  // Notify owner
  try {
    const user = await client.users.fetch(`${client.owner}`);
    const dmChannel = await user.createDM();
    await dmChannel.send(`${client.user.tag} has started.`);
  } catch (error) {
    console.error('Failed to notify owner:', error);
  }

  // Initialize opt-out table
  optOutTable.get((err, ids) => {
    if(err) {
      console.warn('[OptOut]', err.message);
    }
    client.optedOutUsers = ids;
    console.log('[OptOut]', client.optedOutUsers);
    chatter.init(client);
  });
};
