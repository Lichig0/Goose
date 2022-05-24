const path = require('path');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed, MessageButton, MessageActionRow } = require('discord.js');
const math = require('mathjs');
const COMMAND_NAME = path.basename(__filename, '.js');

const DISCORD_INVITE = new MessageButton({
  label: 'Discord',
  style: 'LINK',
  disabled: false,
  url: 'https://discord.gg/HJynKRTEU4'
});

const DONATE_BUTTON = new MessageButton({
  label:'Feed Me',
  style: 'LINK',
  disabled: false,
  url: 'https://www.paypal.com/donate/?business=DEY2DJJ8WZ2SL&no_recurring=0&currency_code=USD&item_name=GOOSE+BOT'
});

const ACTION_ROW = new MessageActionRow().addComponents(DISCORD_INVITE).addComponents(DONATE_BUTTON);

module.exports.getCommandData = () => {
  const slashCommand = new SlashCommandBuilder().setName(COMMAND_NAME).setDescription('Return Stats on this bot instance.');
  return slashCommand.toJSON();
};

module.exports.execute = async (client, interaction) => {
  const { user, uptime, guilds, users } = client;
  const usage = process.resourceUsage();
  const embed = new MessageEmbed();

  const uptimeDuration = math.unit(Math.floor(uptime / 1000), 'seconds').toSI();
  const uptimeString = uptimeDuration.splitUnit(['days','hours','minutes','seconds']);

  embed.addField('Client',
    `${user.tag}
    Uptime: ${uptimeString}
    In ${guilds.cache.size} servers
    Seen ${users.cache.size} different users
    `, true);
  embed.addField('Process', JSON.stringify(usage, null, 2), true);
  await interaction.reply({
    embeds: [embed],
    components: [ACTION_ROW],
    ephemeral: false
  }).catch(console.warn);
};
module.exports.dev = false;
