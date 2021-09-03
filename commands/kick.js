const { Permissions, Constants: {ApplicationCommandTypes, ApplicationCommandOptionTypes} } = require('discord.js');
const settings = require('../settings');
const path = require('path');
const COMMAND_NAME = path.basename(__filename, '.js');

const DEFAULTS = {
  requiredVotes: 5,
  enabled: false,
  voteTime: 60
};

exports.getCommandData = () => {
  return {
    type: ApplicationCommandTypes.CHAT_INPUT,
    name: COMMAND_NAME,
    description: 'Kick a member. Taking your votes now!',
    default_permission: true,
    options: [
      {
        name: 'member',
        type: ApplicationCommandOptionTypes.MENTIONABLE,
        description: 'Member to kick',
        required: true,
      },
      {
        name: 'reason',
        type: ApplicationCommandOptionTypes.STRING,
        description: 'Reson for kick',
        required: false
      }
    ]
  };
};

exports.execute = async (client, interaction, epeen) => {
  const {options, guild, channel} = interaction;
  const mentionableOption = options.get('member');
  const contentOption = options.get('reason');
  const reason = (contentOption && contentOption.value) || '';
  const member_id = mentionableOption.value;
  const member = guild.members.cache.get(member_id);
  const userPermission = interaction.member.permissions;
  const canKick = epeen.has(Permissions.FLAGS.KICK_MEMBERS);
  const config = settings.settings.kick || DEFAULTS;
  const enabled = config.enabled;

  console.log(userPermission);
  if(!canKick) {
    interaction.reply('Your authority is not recognized in Fort Kickass.');
    return;
  } else if(mentionableOption.role) {
    return interaction.reply('A whole role?');
  }

  await interaction.deferReply();

  const kick = (member, invite = false) => {
    member.kick().then(()=> {
      interaction.editReply({
        content: `Kicked ${member}. (${reason}) ${invite ? '' : 'No invite was sent'}`,
      }).catch(console.error);
    }).catch((error) => {
      console.error(error);
      interaction.editReply({
        content: `Failed to kick ${member}`
      }).catch(console.error);
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

  if(member.kickable) {
    inviteAndKick(channel, member, reason);
    return;
  } else if(enabled) {
    interaction.editReply('Lets have a vote~').then(interactionMessage => {
      const filter = (reaction) => (reaction.emoji.name === '👍' || reaction.emoji.name === '👎');
      const time = (config.voteTime || DEFAULTS.voteTime) * 1000;
      const requiredVotes = config.requiredVotes || DEFAULTS.requiredVotes;

      interactionMessage.react('👍').catch(console.error);
      interactionMessage.react('👎').catch(console.error);

      const collector = interactionMessage.createReactionCollector({filter,  time });
      collector.on('end', collected => {
        const upVote = collected.get('👍') ? collected.get('👍').count - 1 : 0;
        const downVote = collected.get('👎') ? collected.get('👎').count - 1 : 0;

        const results = (upVote - downVote) >= requiredVotes || false;
        interactionMessage.reactions.removeAll().catch(e => {
          console.error(e);
          interactionMessage.react('✅');
        });
        if (results) {
          return inviteAndKick(member, channel, reason);
        } else {
          return interaction.followUp('Your authority is not recognized in Fort Kickass.').catch(console.error);
        }
      });
    }).catch(console.error);
  } else {
    interaction.editReply('I\'m sorry, I cannot do that.').catch(console.error);
  }
  return;
};
