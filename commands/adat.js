const path = require('path');
const COMMAND_NAME = path.basename(__filename, '.js');

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
  const channel = interaction.channel;
  const member = interaction.member;

  if(!member.kickable) {
    await interaction.reply({content: 'You are not kickable', ephemeral: true}).catch(console.warn);
    return;
  }
  await interaction.deferReply().catch(console.warn);
  const kick = (member, channel, message) => {
    member.kick().then(async () => {
      let sendString = 'Don\'t let the door hit you on the way out.';
      if(message) {
        sendString = `Reason: ${message.value}`;
      }
      return await interaction.editReply(sendString).catch(console.error);
    }).catch(async kickError => {
      console.error(kickError);
      return await interaction.editReply('ABAT 😔').catch(console.error);
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

exports.getCommandData = getCommandData;
exports.execute = execute;
exports.dev = false;
