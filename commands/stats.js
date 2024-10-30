const path = require('path');
const { ContextMenuCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, ApplicationCommandType } = require('discord.js');
const math = require('mathjs');
const COMMAND_NAME = path.basename(__filename, '.js');

const DISCORD_INVITE = new ButtonBuilder({
  label: 'Discord',
  style: ButtonStyle.Link,
  disabled: false,
  url: 'https://discord.gg/HJynKRTEU4'
});


const ACTION_ROW = new ActionRowBuilder().addComponents(DISCORD_INVITE);

const formatMemoryUsage = (data) => `${Math.round(data / 1024 / 1024 * 100) / 100} MB`;

module.exports.getCommandData = () => {
  const contextCommand = new ContextMenuCommandBuilder()
    .setName(COMMAND_NAME)
    .setType(ApplicationCommandType.User);
  return contextCommand.toJSON();
};

module.exports.execute = async (client, interaction) => {
  const { user, uptime, guilds, users } = client;
  const usage = process.resourceUsage();
  const embed = new EmbedBuilder();

  const uptimeDuration = math.unit(Math.floor(uptime / 1000), 'seconds').toSI();
  const uptimeString = uptimeDuration.splitUnit(['days','hours','minutes','seconds']);

  embed.addFields([
    {
      name:'Client',
      value: `${user.tag}
    Uptime: ${uptimeString}
    In ${guilds.cache.size} servers
    Seen ${users.cache.size} different users
    `,
      inline: true
    },
    {name: 'Heap', value: `${formatMemoryUsage(process.memoryUsage().heapUsed)} / ${formatMemoryUsage(process.memoryUsage().heapTotal)}`, inline: true },
    {name: 'Process', value: `\`\`\`JSON\n${JSON.stringify(usage, null, 2)}\`\`\``, inline: true},
  ]);
  await interaction.reply({
    embeds: [embed],
    components: [ACTION_ROW],
    ephemeral: false
  }).catch(console.warn);
};
module.exports.dev = false;
