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

module.exports.run = (message, epeen) => {
  const { mentions, channel, content} = message;
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
    return kick(member, channel, content);
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
        return kick(member, channel, content);
      } else {
        return message.reply('Your authority is not recognized in Fort Kickass.').catch(console.error);
      }
    });
  } else {
    return message.reply('Your authority is not recognized in Fort Kickass.').catch(console.error);
  }
};

exports.getCommandData = () => {
  return {
    name: COMMAND_NAME,
    description: '(WIP) Kick a member.',
    type: 3, // ???
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


exports.interact = (client, interaction, callback) => {
  const options = interaction.data.options;
  const memberOption = options.find(option=>option.name=='member');
  const contentOption = options.find(option=>option.name=='reason');
  const content = contentOption && contentOption.value;
  const member_id = memberOption.value;
  const {guild_id, channel_id} = interaction;
  const guild = client.guilds.cache.get(guild_id);
  const member = guild.members.cache.get(member_id);
  const userPermission = new Permissions(Number.parseInt(interaction.member.permissions));
  const channel = guild.channels.cache.get(channel_id);
  const canKick = userPermission.has(Permissions.FLAGS.KICK_MEMBERS);
  console.log(userPermission.toArray());
  if(!canKick) {
    return {
      data: {
        type: 4,
        data: {
          content: 'Your authority is not recognized in Fort Kickass.',
          flags: 64
        }
      }
    };
  }
  channel.createInvite({maxUses: 1}).then(invite => {
    member.createDM().then(dm => {
      dm.send(`Get kicked nerd. \n ${content ? `"${content}"`: ''}\n${invite.url}`).catch(console.error);
      callback({data:{
        content: `This is a simulated kick:\n Kicked ${member}. ${content ? `(${content})`: ''}`,
        flags: 1 << 6
      }});
    }).catch(error => {
      console.error(`Could not create/send DM: ${error}`) ;
      callback({data:{
        content: `This is a simulated kick:\n Kicked ${member}. ${content ? `(${content})`: ''}\nNo invite was sent.`
      }});
    });
  }).catch(error => {
    console.error(`Could not create invite. ${error}`);
    callback({data:{
      content: `This is a simulated kick:\n Kicked ${member}. ${content ? `(${content})`: ''}\nNo invite was sent.`
    }});
  });
  return {data: {type: 5}};
  // return {
  //   data: {
  //     type: 4,
  //     data: {
  //       content: 'Still in development',
  //       flags: 1 << 6,
  //     }
  //   }
  // };
};

const kick = (member, channel, content) => {
  // const { channel, content } = message;
  return member
    .kick()
    .then(() => {
      // console.log(message, member);
      channel.createInvite({ maxUses: 1 }).then(invite => {
        member.createDM().then(dm => {
          dm.send(`Get kicked nerd.
                    "${content}"`);
          dm.send(invite.url);
        }).catch(error => console.error(error));
      }).catch(error => console.error(error));
      channel.send(`Get kicked nerd. ${member.user.tag}`);
    })
    .catch(() => channel.send('Error.').catch(console.error));
};