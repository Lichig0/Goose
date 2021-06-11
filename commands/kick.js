const { Permissions } = require('discord.js');
const settings = require('../settings');

const DEFAULTS = {
  requiredVotes: 5,
  enabled: false,
  voteTime: 60
};

exports.help = () => {
  const config = settings.settings.kick;
  const rv = config.requiredVotes || DEFAULTS.requiredVotes;
  return `'Kick a member. (User needs kick permission, or ${rv})\n`;
};

module.exports.run = (message, epeen) => {
  const { mentions} = message;
  const member = mentions.members.first();
  const config = settings.settings.kick || DEFAULTS;
  const enabled = config.enabled;
  const kick_perm = epeen.has(Permissions.FLAGS.KICK_MEMBERS);
  if (!member) {
    return message.reply('Who are you trying to kick?').catch(console.error);
  }
  if(!member.kickable) {
    return message.reply('I\'m sorry, I cannot do that.').catch(console.error);
  }
  if (kick_perm) {
    return kick(member, message);
  } else if(enabled) {
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
        message.react('✅');
      });
      if (results) {
        return kick(member, message);
      } else {
        return message.reply('Your authority is not recognized in Fort Kickass.').catch(console.error);
      }
    });
  } else {
    return message.reply('Your authority is not recognized in Fort Kickass.').catch(console.error);
  }
};

const kick = (member, message) => {
  const { channel, content } = message;
  return member
    .kick()
    .then(() => {
      console.log(message, member);
      channel.createInvite({ maxUses: 1, unique: true }).then(invite => {
        member.createDM().then(dm => {
          dm.send(`Get kicked nerd.
                    "${content}"`);
          dm.send(invite.url);
        }).catch(error => console.error(error));
      }).catch(error => console.error(error));
      channel.send(`Get kicked nerd. ${member.user.tag}`);
    })
    .catch(() => message.reply('Error.'));
};
