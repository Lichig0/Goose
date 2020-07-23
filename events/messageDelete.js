const Discord = require("discord.js");


module.exports = (client, messageDelete) => {
  const deleteChannel = messageDelete.guild.channels.cache.find(ch => ch.name === 'deleted');
  if (messageDelete.attachments && messageDelete.attachments.size > 0 && messageDelete) { // If I change this to: message.attachments.size>0 && message it works with deleted image & text but as it is without this said line it doesn't function

    var Attachment = (messageDelete.attachments).array();

    Attachment.forEach(function (attachment) {
      const logembed = new Discord.MessageEmbed()

        .setAuthor(messageDelete.author.tag, messageDelete.author.displayAvatarURL)
        .setDescription(`**Image sent by ${messageDelete.author.tag} deleted in <#${messageDelete.channel.id}>**`)
        .setImage(attachment.proxyURL)

        .setColor(messageDelete.guild.member(client.user).displayHexColor)

        .setFooter(`Deleted Image`)
        .setTimestamp()

      deleteChannel.send(logembed);
      console.log(attachment.proxyURL);
    })
  } else {
    const logembed = new Discord.MessageEmbed()
      //.setTitle('Message Deleted')
      .setAuthor(messageDelete.author.tag, messageDelete.author.displayAvatarURL)
      .setDescription(`**Message sent by ${messageDelete.author.tag} deleted in <#${messageDelete.channel.id}>**`)
      .addField("Message Content", `${messageDelete.content}`)

      .setColor(messageDelete.guild.member(client.user).displayHexColor)

      .setFooter(`Deleted Message`)
      .setTimestamp()

    deleteChannel.send(logembed);

  }
}