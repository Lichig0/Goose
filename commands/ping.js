const COMMAND_NAME = 'ping';
exports.help = () => 'Pong? \n';
module.exports.run = message => {
  const { channel } = message;
  channel.send('Pong~');
  // author.createDM().then(dm => dm.send("Pong~"));
};
module.exports.getCommandData = () => {
  return {
    name: COMMAND_NAME,
    description: 'Pong.'
  };
};
module.exports.interact = (interaction, callback) => {
  return { data: {
    type: 4,
    data: {
      content: 'Pong~',
      flags: 1 << 6
    }}
  };
};