const chatter = require('../chatter/chatter');
const { Permissions } = require('discord.js');
const settings = require('../settings');

const DEFAULTS = {
  voteTime: 15,
  requiredVotes: 3,
};

exports.help = () => 'Get conversation data from the channel the command is used it. \n';
module.exports.run = (message, epeen) => {
  const {channel, guild} = message;
  const admin_perm = epeen.has(Permissions.FLAGS.ADMINISTRATOR) || message.member.user.id === '341338359807082506';
  if (admin_perm){
    const textChannels = guild.channels.cache.filter(ch => ch.name == channel.name && ch.viewable);
    chatter.buildData(message, textChannels);
  } else {
    const config = settings.settings.chatter;
    // message.react('🦆');
    // start polling
    const filter = (reaction) => (reaction.emoji.name === '👍' || reaction.emoji.name === '👎');
    const time = (config.voteTime || DEFAULTS.voteTime) * 1000;
    const requiredVotes = config.requiredVotes || DEFAULTS.requiredVotes;

    message.react('👍').catch(console.error);
    message.react('👎').catch(console.error);

    const collector = message.createReactionCollector(filter, { time });
    collector.on('end', collected => {
      const upVote = collected.get('👍') ? collected.get('👍').count - 1 : 0;
      const downVote = collected.get('👎') ? collected.get('👎').count - 1 : 0;

      const results = (upVote - downVote) >= requiredVotes || false;
      message.reactions.removeAll().catch(e => {
        console.error(e);
        message.react('👍').catch(console.error);
        message.react('👎').catch(console.error);
      });
      if (results) {
        message.react('✅');
        const textChannels = guild.channels.cache.filter(ch => ch.name == channel.name && ch.viewable);
        chatter.buildData(message, textChannels);
      } else {
        message.react('❌');
      }
    });
  }
  return;
};