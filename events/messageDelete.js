const { EmbedBuilder } = require('discord.js');
const Chance = require('chance');

const chance = new Chance();
let canAnnounceDelete = true;
let isBotMessage = false;
const deleteMessages = [
  'Why don\'t you dissapear like your messages.',
  'I saw that.',
  '🙄',
  'Um.',
  '|| **R E D A C T E D** ||',
  'Nice password.',
  'Adding to the heap.',
  'I would have done that too.',
  'I don\'t think anyone noticed',
  '*NSA#8008 has joined the party.*',
  '*NSA#8008 has joined chat.*',
  'At least share something good next time.',
  'W̶̯͑ḧ̸́ͅä̶̜t̴͕͐ ̸̭͘h̶̺́a̷̖͝v̴̼̐e̷̐ͅ ̵̤̒y̴̫̾ö̶́ͅu̶͚͆ ̷̦̂d̶̬̀o̶͇͊n̴̲̽ě̴̟!̸̯͋?̶̛̻',
];

module.exports = (client, messageDelete) => {
  console.log('[Message Deleted]');
  isBotMessage = messageDelete.author.bot;
  const optedOutIds = client.optedOutUsers.map(({userId}) => userId);
  if(optedOutIds.includes(messageDelete.author.id)) return;

  const deleteChannel = messageDelete.guild.channels.cache.find(ch => ch.name === 'deleted');
  const sendSawThat = (e) => {
    if(e) console.error(e);
    if(chance.bool({likelihood: 33}) && canAnnounceDelete && !isBotMessage) {
      const chatter = chance.bool() ? 'I saw that.' : chance.pickone([...deleteMessages,chance.syllable(), chance.sentence()]);
      messageDelete.channel.send(chatter).catch(console.error);
      canAnnounceDelete = false;
      setTimeout(()=>canAnnounceDelete = true,1*(1000*60*60*3),chance.bool({likelihood:65}));
    }
  };

  if(!deleteChannel) {
    console.log('No Delete channel');
    sendSawThat();
    return;
  }
  if (messageDelete.attachments && messageDelete.attachments.size > 0 && messageDelete) { // If I change this to: message.attachments.size>0 && message it works with deleted image & text but as it is without this said line it doesn't function

    const Attachment = [...messageDelete.attachments.values()];

    Attachment.forEach(function (attachment) {
      const logEmbed = new EmbedBuilder()

        .setAuthor({ name: messageDelete.author.tag, iconURL: messageDelete.author.displayAvatarURL()})
        .setDescription(`**Image sent by ${messageDelete.author.tag} deleted in <#${messageDelete.channel.id}>**`)
        .setImage(attachment.proxyURL)
        .setFooter({ text: 'Deleted Image'})
        .setTimestamp();

      deleteChannel.send({embeds: [logEmbed]}).catch(sendSawThat);
    });
  } else {
    const logEmbed = new EmbedBuilder()
      .setTitle('Message Deleted')
      .setAuthor({ name: messageDelete.author.tag, iconURL: messageDelete.author.displayAvatarURL()})
      .setDescription(`**Message sent by ${messageDelete.author.tag} deleted in <#${messageDelete.channel.id}>**`)
      .setFooter({ text: 'Deleted Message'})
      .setTimestamp();
    if(messageDelete.content) logEmbed.addFields([{name: 'Message Content', value: `${messageDelete.content}`}]);
    deleteChannel.send({embeds: [logEmbed]}).catch(sendSawThat);

  }
};
