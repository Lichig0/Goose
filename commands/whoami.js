const {MessageEmbed} = require('discord.js');

module.exports.run = (message) => {
  const { author } = message;

  const logembed = new MessageEmbed()
    .setAuthor(author.tag)
    .setDescription(`**Details of ${author.tag} **`)
    .setTimestamp();
  for(let prop in author) {
    if(prop === 'flags') continue;
    logembed.addField(prop,author[prop]);
  }
  author.createDM().then(dm => {
    dm.send(logembed);
  }).catch(error => console.error(error));
};

const help = () => 'PM you some details about you.\n';

exports.help = help;