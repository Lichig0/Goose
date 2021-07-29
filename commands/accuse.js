const { Permissions } = require('discord.js');
exports.help = () => 'Accuse a memeber of being a Bot Abuser. (User needs role permission)\n';
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
  members.array().forEach(member => {
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
