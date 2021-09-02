const { Permissions, Constants: {ApplicationCommandOptionTypes} } = require('discord.js');
exports.help = () => 'Accuse a memeber of being a Bot Abuser. (User needs role permission)\n';
const path = require('path');
const COMMAND_NAME = path.basename(__filename, '.js');
const PARAMETERS = {
  MEMBER: 'member',
  LIFT: 'lift'
};
module.exports.getCommandData = () => {
  /*
  SUB_COMMAND	1
SUB_COMMAND_GROUP	2
STRING	3
INTEGER	4
BOOLEAN	5
USER	6
CHANNEL	7
ROLE	8
MENTIONABLE	9
*/
  return {
    name: COMMAND_NAME,
    description: 'Accuse someone of being a bot abuser.',
    default_permission: false,
    options: [
      {
        name: PARAMETERS.MEMBER,
        description: 'Member to accuse',
        type: ApplicationCommandOptionTypes.MENTIONABLE,
        required: true
      },
      {
        name: PARAMETERS.LIFT,
        description: 'Lift the accusation',
        type: ApplicationCommandOptionTypes.BOOLEAN,
        required: false
      }
    ]
  };
};
module.exports.execute = async (client, interaction, epeen) => {
  const role_perm = epeen.has(Permissions.FLAGS.MANAGE_ROLES);
  const mentionable = interaction.options.get(PARAMETERS.MEMBER);
  const lift = interaction.options.get(PARAMETERS.LIFT)?.value;
  const guild = interaction.guild;

  await interaction.deferReply();
  let role = interaction.guild.roles.cache.find(r => r.name === 'Bot Abuser');
  if (!role) {
    // Create a new role with data and a reason
    guild.roles.create({
      data: {
        name: 'Bot Abuser',
        color: '#067676',
        reason: 'Sometimes you need to ignore the people.',
      }
    }).then((r) => {
      role = r;
    }).catch((err) => {
      console.error(err);
      return;
    });
  }
  const members = mentionable.role ? [...mentionable.role.members.values()] : [mentionable.member];
  members.map(member => {
    if (!member.manageable || !role_perm) {
      return interaction.editReply(`***Honk.*** (${member.user.username})`);
    }
    if (lift) {
      return member.roles.add(role);
    } else {
      return member.roles.remove(role);
    }
  });
};

module.exports.run = (message, epeen, who = undefined) => {
  const role_perm = epeen.has(Permissions.FLAGS.MANAGE_ROLES);
  let members = who || message.mentions.members;
  const guild = message.guild;
  if(message.mentions.everyone) {
    members = message.channel.members;
  }
  if (!members || !message.guild) {
    return;
  }

  let role = message.guild.roles.cache.find(r => r.name === 'Bot Abuser');
  if (!role) {
    // Create a new role with data and a reason
    guild.roles.create({
      data: {
        name: 'Bot Abuser',
        color: '#067676',
        reason: 'Sometimes you need to ignore the people.',
      }
    }).then((r) => {
      role = r;
    }).catch((err) => {
      console.error(err);
      return;
    });

  }
  members.each(member => {
    if (!member.manageable || !role_perm) {
      return message.channel.send(`***Honk.*** (${member.user.username})`);
    }
    if (!message.content.includes('lift')) {
      return member.roles.add(role);
    } else {
      return member.roles.remove(role);
    }
  });

};
