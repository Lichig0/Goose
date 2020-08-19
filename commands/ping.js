exports.help = () => 'Pong? \n';
module.exports.run = message => {
  const { author, channel } = message;
  channel.send('Pong~');
  // author.createDM().then(dm => dm.send("Pong~"));
};