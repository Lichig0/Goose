const Discord = require('discord.js');
const Chance = require('chance');

const chance = new Chance();
let canAnnounceDelete = true;
const deleteMessages = [
  'Why don\'t you dissapear like your messages.',
  'I saw that.',
  '🙄',
  'Um.',
  '|| **R E D A C T E D** ||',
  'Nice password.'
];

module.exports = (client, messageDelete) => {
  const deleteChannel = messageDelete.guild.channels.cache.find(ch => ch.name === 'deleted');
  const sendSawThat = (e) => {
    if(e) console.error(e);
    if(chance.bool() && canAnnounceDelete) {
      const chatter = chance.bool({likelihood: 90}) ? 'I saw that.' : chance.pickone(deleteMessages);
      messageDelete.channel.send(chatter).catch(console.error);
      canAnnounceDelete = false;
      setTimeout(()=>canAnnounceDelete = true,1*(1000*60*60*3));
    }
  };

  console.log('[Message Deleted]');
  if(!deleteChannel) {
    console.log('No Delete channel');
    sendSawThat();
    return;
  }
  if (messageDelete.attachments && messageDelete.attachments.size > 0 && messageDelete) { // If I change this to: message.attachments.size>0 && message it works with deleted image & text but as it is without this said line it doesn't function

    var Attachment = [...(messageDelete.attachments).values()];

    Attachment.forEach(function (attachment) {
      const logembed = new Discord.MessageEmbed()

        .setAuthor(messageDelete.author.tag, messageDelete.author.displayAvatarURL)
        .setDescription(`**Image sent by ${messageDelete.author.tag} deleted in <#${messageDelete.channel.id}>**`)
        .setImage(attachment.proxyURL)
        .setFooter('Deleted Image')
        .setTimestamp();

      deleteChannel.send(logembed).catch(sendSawThat);
    });
  } else {
    const logembed = new Discord.MessageEmbed()
      //.setTitle('Message Deleted')
      .setAuthor(messageDelete.author.tag, messageDelete.author.displayAvatarURL)
      .setDescription(`**Message sent by ${messageDelete.author.tag} deleted in <#${messageDelete.channel.id}>**`)
      .addField('Message Content', `${messageDelete.content}`)
      .setFooter('Deleted Message')
      .setTimestamp();

    deleteChannel.send(logembed).catch(sendSawThat);

  }
};
