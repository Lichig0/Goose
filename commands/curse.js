const { Permissions } = require('discord.js');
const settings = require('../settings');

const DEFAULTS = {
  requiredVotes: 5,
  enabled: false,
  voteTime: 60,
  timeOut: 120
};

exports.help = () => 'Cast curse on a member. (User needs role permission)\n';
module.exports.run = (message, epeen, who = undefined) => {
  const config = settings.settings.curse || DEFAULTS;
  const enabled = config.enabled || DEFAULTS.enabled;
  const role_perm = epeen.has(Permissions.FLAGS.MANAGE_ROLES);
  let members = who || message.mentions.members;
  const guild = message.guild;
  if(message.mentions.everyone) {
    members = message.channel.members;
  }
  if (!members || !message.guild) {
    return;
  }

  let role = message.guild.roles.cache.find(r => r.name === 'cursed');
  if (!role) {
    // Create a new role with data and a reason
    guild.roles.create({
      data: {
        name: 'cursed',
        color: '#2B2B2B',
        position: 10,
        permissions: new Permissions(327744),
      },
      reason: 'Sometimes you need to silence the people.',
    }).then((r) => {
      role = r;
    }).catch((err) => {
      console.error(err);
      return;
    });

  }

  const sendDenial = member => member ? message.channel.send(`***Honk.*** (${member.user.username})`).catch(console.error): message.react('🦆').catch(console.error);
  const curse = (member, timeout) => {
    if (!message.content.includes('lift')) {
      member.roles.add(role).catch(console.error);
      if (timeout) setTimeout(() => member.roles.remove(role).catch(console.error), timeout);
    } else {
      return member.roles.remove(role).catch(console.error);
    }
  };
  const curseMembers = (timeout) => {
    members.array().forEach(member => {
      if (!member.manageable) {
        return sendDenial(member);
      }
      return curse(member, timeout);
    });
  };

  if(role_perm) {
    curseMembers();
  }
  if(!role_perm && enabled) {
    // start polling
    const filter = (reaction) => (reaction.emoji.name === '👍' || reaction.emoji.name === '👎');
    const time = config.voteTime || DEFAULTS.voteTime;
    const timeOut = config.timeOut || DEFAULTS.timeOut;
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
        return curseMembers(timeOut);
      } else {
        message.react('❌');
        return sendDenial();
      }
    });
  } else {
    return sendDenial();
  }

};
