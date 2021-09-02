const path = require('path');
const COMMAND_NAME = path.basename(__filename, '.js');

module.exports.run = (message) => {
  const {author, channel, guild} = message; // author is type User
  guild.members.fetch(author.id).then(m => {
    if (m.kickable === false) {
      return message.reply('ABAT!');
    }
    channel.createInvite({ maxUses: 1, unique: true }).then(invite => {
      author.createDM().then(dm => {
        dm.send(`When you're not ADAT: ${invite.url}`).then(()=> {
          m.kick().then(() => {
            console.log(message, author);
          }).catch(console.error);
        });
      }).catch(error => {
        console.error(error);
        channel.send('Couldn\'t send an invite. Sucks for them.').catch(console.error);
        m.kick().then(() => {
          console.log(message, author);
        }).catch(console.error);
      });
    }).catch(console.error);

    channel.send(`ADAT! -${m.tag.tag}`);

  });
};

const help = () => 'This will kick the command user; and (hopefully) send the user an invite to come back.\n';

const getCommandData = () => {
  return {
    name: COMMAND_NAME,
    description: 'All Discrods Are Terrible!',
    options: [{
      name: 'message',
      type: 3,
      description: 'Why is this discord terrible?',
      required: false,
    }],
  };
};

const execute = async (client, interaction) => {
  const messageOption = interaction.options.get('message')?.value;
  // const {guild_id, channel_id} = interaction;
  // const guild = client.guilds.cache.get(guild_id);
  const channel = interaction.channel;
  const member = interaction.member;

  if(!member.kickable) {
    await interaction.reply({content: 'You are not kickable', ephemeral: true});
    return;
  }
  await interaction.deferReply();
  const kick = (member, channel, message) => {
    member.kick().then(() => {
      let sendString = 'Don\'t let the door hit you on the way out.';
      if(message) {
        sendString = `Reason: ${message.value}`;
      }
      interaction.editReply(sendString);
    }).catch(kickError => {
      console.error(kickError);
      interaction.editReply('ABAT 😔');
    });
  };


  const invite = await channel.createInvite({maxUses:1, unique: true});
  member.user.createDM().then(dm => {
    dm.send(`When you're not ADAT: ${invite.url}`).then(() => {
      kick(member, channel, messageOption);
    }).catch(e => {
      console.error(e);
      channel.send('Couldn\'t send an invite. Sucks for them.').catch(console.error);
      kick(member, channel, messageOption);
    });
  }).catch(e => { // Could not DM
    console.error(e);
    channel.send('Couldn\'t send an invite. Sucks for them.').catch(console.error);
    kick(member, channel, messageOption);
  });
};

exports.help = help;
exports.getCommandData = getCommandData;
exports.execute = execute;
exports.isDev = true;
