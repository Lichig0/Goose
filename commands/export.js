const fs = require('fs');
const { MessageAttachment } = require('discord.js');
exports.help = () => 'Export conversation cache json to you(this will likely fail)\n';
module.exports.run = (message) => {
  const { author, channel } = message;

  return author.createDM().then(dm => {
    dm.startTyping();
    const buffer = fs.readFileSync('./cache.json');
    const attachment = new MessageAttachment(buffer, 'memes.txt');
    // dm.send('Exported cache', attachment);
    dm.send({
      files: [{
        attachment: './cache.json',
        name: 'cache.json'
      }]
    }).then(console.log).catch(console.error).finally(() => {
      dm.stopTyping();
    });
  }).catch(error => console.error(error));
};
