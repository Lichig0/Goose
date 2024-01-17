const { PermissionsBitField, ApplicationCommandOptionType } = require('discord.js');
const settings = require('../settings');
const path = require('path');
const COMMADN_NAME = path.basename(__filename, '.js');
const PARAMS = {
  MEMBER: 'member',
  LIFT: 'lift'
};

const DEFAULTS = {
  requiredVotes: 5,
  enabled: false,
  voteTime: 60,
  timeOut: 120
};

exports.execute = async (client, interaction, epeen) => {
  const config = settings.settings.curse || DEFAULTS;
  const enabled = config.enabled || DEFAULTS.enabled;
  const role_perm = epeen.has(PermissionsBitField.Flags.ManageRoles);
  const guild = interaction.guild;
  const mentionable = interaction.options.get(PARAMS.MEMBER);
  const lift = interaction.options.get(PARAMS.LIFT)?.value;
  // const members = mentionable.role.members ? [...mentionable.role.members.values()] : [mentionable];
  // await interaction.deferReply();
  await interaction.reply('Casting curse...').catch(console.warn);

  let role = interaction.guild.roles.cache.find(r => r.name === 'cursed');
  if (!role) {
    // Create a new role with data and a reason
    guild.roles.create({
      data: {
        name: 'cursed',
        color: '#2B2B2B',
        position: 10,
        // eslint-disable-next-line no-undef
        permissions: new PermissionsBitField(BigInt(327744)),
        reason: 'Sometimes you need to silence the people.',
      }
    }).then((r) => {
      role = r;
    }).catch((err) => {
      console.error(err);
      return;
    });

  }

  const sendDenial = member => {
    return member ? interaction.editReply(`***Honk.*** (${member})`).catch(console.error): interaction.editReply('🦆').catch(console.error);

  };
  const curse = async (member, timeout) => {
    console.log(lift);
    if (!lift) {
      member.roles.add(role).catch(console.error);
      await interaction.editReply('Cursing').catch(console.error);
      if (timeout) setTimeout(() => member.roles.remove(role).catch(console.error), timeout);
    } else {
      await interaction.editReply('Lifting curse').catch(console.error);
      member.roles.remove(role).catch(console.error);
    }
  };
  const curseMembers = (timeout) => {
    const members = mentionable.role ? [...mentionable.role.members.values()] : [mentionable.member];
    members.map(member => {
      if (!member.manageable) {
        return sendDenial(member);
      }
      return curse(member, timeout);
    });
  };

  if(role_perm) {
    return curseMembers();
  }
  if(!role_perm && enabled) {
    // start polling
    const filter = (reaction) => (reaction.emoji.name === '👍' || reaction.emoji.name === '👎');
    const time = (config.voteTime || DEFAULTS.voteTime) * 1000;
    const timeOut = (config.timeOut || DEFAULTS.timeOut) * 1000;
    const requiredVotes = config.requiredVotes || DEFAULTS.requiredVotes;
    interaction.editReply(`Voting to curse ${mentionable.name}`).then((message) => {
      message.react('👍').catch(console.error);
      message.react('👎').catch(console.error);

      const collector = message.createReactionCollector({filter,  time });
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
    }).catch(console.error);

  } else {
    return sendDenial();
  }
};

exports.getCommandData = () => {
  return {
    name: COMMADN_NAME,
    description: 'Sometimes you need to silence people',
    default_permission: false,
    options: [
      {
        name: PARAMS.MEMBER,
        description: 'Member to curse',
        type: ApplicationCommandOptionType.Mentionable,
        required: true
      },
      {
        name: PARAMS.LIFT,
        description: 'Lift the curse',
        type: ApplicationCommandOptionType.Boolean,
        required: false
      }
    ]
  };
};
exports.dev = false;
