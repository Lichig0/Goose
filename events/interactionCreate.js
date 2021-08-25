module.exports = async (client, interaction) => {
  console.log(interaction.isCommand(), interaction.member, interaction.member.permissions);
};
