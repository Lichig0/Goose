const { Permissions } = require('discord.js');
const settings = require('../settings');
const path = require('path');
const COMMAND_NAME = path.basename(__filename, '.js');

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

// module.exports.run = (message, epeen) => {
//   const { mentions, channel, content} = message;
//   const member = mentions.members.first();
//   const config = settings.settings.kick || DEFAULTS;
//   const enabled = config.enabled;
//   const kick_perm = epeen.has(Permissions.FLAGS.KICK_MEMBERS);
//   if (!member) {
//     return message.reply('Who are you trying to kick?').catch(console.error);
//   }
//   if(!member.kickable) {
//     return message.reply('I\'m sorry, I cannot do that.').catch(console.error);
//   }
//   if (kick_perm) {
//     return legacyKick(member, channel, content);
//   } else if(enabled) {
//     const filter = (reaction) => (reaction.emoji.name === '👍' || reaction.emoji.name === '👎');
//     const time = (config.voteTime || DEFAULTS.voteTime) * 1000;
//     const requiredVotes = config.requiredVotes || DEFAULTS.requiredVotes;

//     message.react('👍').catch(console.error);
//     message.react('👎').catch(console.error);

//     const collector = message.createReactionCollector({filter,  time });
//     collector.on('end', collected => {
//       const upVote = collected.get('👍') ? collected.get('👍').count - 1 : 0;
//       const downVote = collected.get('👎') ? collected.get('👎').count - 1 : 0;

//       const results = (upVote - downVote) >= requiredVotes || false;
//       message.reactions.removeAll().catch(e => {
//         console.error(e);
//         message.react('✅');
//       });
//       if (results) {
//         return legacyKick(member, channel, content);
//       } else {
//         return message.reply('Your authority is not recognized in Fort Kickass.').catch(console.error);
//       }
//     });
//   } else {
//     return message.reply('Your authority is not recognized in Fort Kickass.').catch(console.error);
//   }
// };

exports.getCommandData = () => {
  return {
    name: COMMAND_NAME,
    description: 'Kick a member.',
    default_permission: true,
    options: [
      {
        name: 'member',
        type: 6,
        description: 'Member to kick',
        required: true,
      },
      {
        name: 'reason',
        type: 3,
        description: 'Reson for kick',
        required: false
      }
    ]
  };
};


exports.execute = async (client, interaction, epeen) => {
  const {options, guild, channel} = interaction;
  const memberOption = options.get('member').value;
  const contentOption = options.get('reason').value;
  const reason = (contentOption && contentOption.value) || '';
  const member_id = memberOption.value;
  const member = guild.members.cache.get(member_id);
  const userPermission = interaction.member.permissions;
  const canKick = epeen.has(Permissions.FLAGS.KICK_MEMBERS);
  console.log(userPermission);
  if(!canKick) {
    interaction.reply('Your authority is not recognized in Fort Kickass.');
    return;
  }
  if(!member.kickable) {
    interaction.reply('I\'m sorry, I cannot do that.');
    return;
  }
  await interaction.deferReply();

  const kick = (member, invite = false) => {
    member.kick().then(()=> {
      interaction.editReply({
        content: `Kicked ${member}. (${reason}) ${invite ? '' : 'No invite was sent'}`,
      });
    }).catch((error) => {
      console.error(error);
      interaction.editReply({
        content: `Failed to kick ${member}`
      });
    });
  };

  const inviteAndKick = async (channel, member, reason) => {
    const invite = await channel.createInvite({maxUses: 1, unique: true}).catch(console.error);
    const dmChannel = await member.createDM().catch(console.error);
    let sent = false;
    if(dmChannel) {
      sent = await dmChannel.send(`Get kicked nerd \n ${reason ? `"${reason}"` : ''}\n ${invite ? `${invite.url}` : ''}`);
    }
    kick(member, sent);
  };


  inviteAndKick(channel, member, reason);
  return;
};
