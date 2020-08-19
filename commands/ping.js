exports.help = () => 'Pong? \n';
module.exports.run = message => {
  const { channel } = message;
  channel.send('Pong~');
  // author.createDM().then(dm => dm.send("Pong~"));
};