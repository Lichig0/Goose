const path = require('path');
const { MessageEmbed, Constants: {ApplicationCommandTypes, ApplicationCommandOptionTypes} } = require('discord.js');
const GiantBomb = require('giant-bomb');
const gb = new GiantBomb(process.env.GIANT_BOMB_KEY, 'Goose bot game search for Bounty Board. Retrieve game info for bounties.');

const COMMAND_NAME = path.basename(__filename, '.js');

module.exports.getGame = (callback, id) => {
  const guid = id || Math.floor(Math.random() * 90000);
  const options = {
    id: guid,
    format: 'json',
    fields: [
      'name', 'guid', 'image', 'aliases', 'deck', 'platforms', 'similar_games', 'themes', 'site_detail_url',
      'genres', 'franchises', 'characters', 'concepts', 'developers', 'original_release_date',
      'expected_release_year', 'expected_release_month', 'expected_release_day', 'expected_release_quarter'
    ]
  };

  gb.getGame(options).then( response => {
    if(response === null) { return console.warn(response); }
    const json = JSON.parse(response);
    if (json.status_code !== 1) { return console.warn(json.error); }
    callback(json.results);
  });
};
module.exports.getCommandData = () => {
  return {
    type: ApplicationCommandTypes.CHAT_INPUT,
    name: COMMAND_NAME,
    description: 'Look up a video game; brought to you by Giant Bomb (Not a sponsor)',
    default_permission: true,
    options: [
      {
        name: 'game',
        type: ApplicationCommandOptionTypes.STRING,
        description: 'Game name to search for',
        required: true
      }
    ]
  };
};
module.exports.execute = async (client, interaction) => {
  await interaction.deferReply();

  const gameName = interaction.options.get('game').value;
  const options = {
    query: gameName,
    fields: ['name','guid', 'image', 'aliases', 'deck',
      'description','original_release_date', 'site_detail_url',
      'platforms', 'expected_release_day', 'expected_release_month',
      'expected_release_year', 'expected_release_quarter'],
    resources: ['game']
  };

  gb.search(options).then(response => {
    const j = JSON.parse(response);
    const games = j.results;
    const game = games[0];
    if(game === undefined) return interaction.editReply('No result.').catch(console.warn);
    const { name, guid, image, aliases, deck,
      original_release_date, site_detail_url,
      platforms, expected_release_day, expected_release_month,
      expected_release_year, expected_release_quarter } = game;

    let plats = [];
    platforms.forEach(platform => plats.push(platform.name));

    let otherGames = [];
    games.forEach( (g, i) => {
      if(i > 0 && i <= 10) {
        otherGames.push(g.name);
      }
    });

    const embed = new MessageEmbed();
    embed.setTitle(name).setDescription(deck).setURL(site_detail_url);
    embed.setFooter(guid);
    embed.setThumbnail(image.original_url);
    embed.addField('Platforms', `${plats}`, true);
    if(aliases) embed.addField('Alias(es)', aliases);
    if(original_release_date) embed.addField('Released', original_release_date, true);
    if (!original_release_date) embed.addField('Expected release', `${expected_release_year || '????'} - ${expected_release_month || '??' } - ${expected_release_day || '??'} Q${expected_release_quarter || '?'}`);
    if (otherGames.toString() !== '')embed.addField('More results', otherGames.toString(), true);
    interaction.editReply({embeds: [embed]}).catch(console.warn);
  }).catch(console.error);
};
module.exports.dev = false;
