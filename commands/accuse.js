const { Permissions, Constants: {ApplicationCommandOptionTypes} } = require('discord.js');
exports.help = () => 'Accuse a memeber of being a Bot Abuser. (User needs role permission)\n';
const path = require('path');
const COMMAND_NAME = path.basename(__filename, '.js');
const PARAMETERS = {
  MEMBER: 'member',
  LIFT: 'lift'
};
module.exports.getCommandData = () => {
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
  members.map(async member => {
    if (!member.manageable || !role_perm) {
      await interaction.editReply(`***Honk.*** (${member.user.username})`).catch(console.error);
    }
    else if (!lift) {
      member.roles.add(role).catch(console.error);
      await interaction.editReply(`${member.user.username} has been accuse of abusing bots.`).catch(console.error);
    } else {
      member.roles.remove(role);
      await interaction.editReply(`${member.user.username} better be on their best behavior.`).catch(console.error);
    }
  });
};
