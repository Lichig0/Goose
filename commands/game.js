const path = require('path');
const { MessageEmbed, Constants: {ApplicationCommandTypes, ApplicationCommandOptionTypes} } = require('discord.js');
const GiantBomb = require('giant-bomb');
const gb = new GiantBomb(process.env.GIANT_BOMB_KEY, 'Goose bot game search for Bounty Board. Retrieve game info for bounties.');

const COMMAND_NAME = path.basename(__filename, '.js');
const SUB_COMMAND = {
  SEARCH: 'search',
  GET: 'get',
  RANDOM: 'random'
};
const OPTIONS = {
  NAME: 'name',
  ID: 'id',
};

const searchGame = (searchString, callback) => {
  const options = {
    query: searchString,
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
    const embed = new MessageEmbed();
    if(game === undefined) return callback(embed.setTitle('No Results.'));
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

    embed.setTitle(name).setDescription(deck).setURL(site_detail_url);
    embed.setFooter(guid);
    embed.setThumbnail(image.original_url);
    embed.addField('Platforms', `${plats}`, true);
    if(aliases) embed.addField('Alias(es)', aliases);
    if(original_release_date) embed.addField('Released', original_release_date, true);
    if (!original_release_date) embed.addField('Expected release', `${expected_release_year || '????'} - ${expected_release_month || '??' } - ${expected_release_day || '??'} Q${expected_release_quarter || '?'}`);
    if (otherGames.toString() !== '')embed.addField('More results', otherGames.toString(), true);
    // interaction.editReply({embeds: [embed]}).catch(console.warn);
    return callback(embed);
  }).catch(console.error);
};

const getGame = (id, callback) => {
  const options = {
    id: id ?? Math.floor(Math.random() * 90000),
    format: 'json',
    fields: [
      'name', 'guid', 'image', 'aliases', 'deck', 'platforms', 'similar_games', 'themes', 'site_detail_url',
      'genres', 'franchises', 'characters', 'concepts', 'developers', 'original_release_date',
      'expected_release_year', 'expected_release_month', 'expected_release_day', 'expected_release_quarter'
    ]
  };
  gb.getGame(options).then( response => {
    const embed = new MessageEmbed();
    if(response === null) { return callback(embed.setTitle('Not found.')); }
    const json = JSON.parse(response);
    if (json.status_code !== 1) { return callback(embed.setTitle('Error').setDescription(json.error)); }
    const {name, guid, image, aliases, deck, platforms, similar_games, site_detail_url,
      genres, franchises, developers, original_release_date,
      expected_release_year, expected_release_month, expected_release_day, expected_release_quarter
    } = json.results;

    let plats = [];
    platforms ? platforms.forEach(platform => plats.push(platform.name)) : plats.push('No data.');
    let similarGames = [];
    similar_games ? similar_games.forEach(similar => similarGames.push(similar.name)) : similarGames.push('No data.');
    let devs = [];
    developers ? developers.forEach(dev => devs.push(dev.name)) : devs.push('No data.') ;
    let frans = [];
    franchises ? franchises.forEach(franchise => frans.push(franchise.name)) : frans.push('No data.');
    let genre = [];
    genres ? genres.forEach(g => genre.push(g.name)) : genre.push('No data.');

    embed.setTitle(name).setDescription(deck).setURL(site_detail_url);
    embed.setFooter(guid);
    embed.setThumbnail(image.original_url);
    if (original_release_date) embed.addField('Released', original_release_date, true);
    if (!original_release_date) embed.addField('Expected release', `${expected_release_year || '????'} - ${expected_release_month || '??'} - ${expected_release_day || '??'} Q${expected_release_quarter || '?'}`);
    if (aliases) embed.addField('Alias(es)', aliases);
    embed.addFields([
      { name: 'Similar Games', value: `${similarGames}`, inline: true },
      { name: 'Platforms', value: `${plats}`, inline: true},
      { name: 'Developers', value: `${devs}`, inline: true },
      { name: 'Franchise', value: `${frans}`, inline: true },
      { name: 'Genres', value: `${genre}`, inline: true },
    ]);
    callback(embed);
  }).catch(console.error);

};

module.exports.getGame = (id, callback) => {
  const guid = id ?? Math.floor(Math.random() * 90000);
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
  }).catch(console.error);
};

module.exports.getCommandData = () => {
  return {
    type: ApplicationCommandTypes.CHAT_INPUT,
    name: COMMAND_NAME,
    description: 'Look up a video game; brought to you by Giant Bomb (Not a sponsor)',
    default_permission: true,
    options: [
      {
        name: SUB_COMMAND.SEARCH,
        type: ApplicationCommandOptionTypes.SUB_COMMAND,
        description: 'Search for a game',
        options: [
          {
            name: OPTIONS.NAME,
            type: ApplicationCommandOptionTypes.STRING,
            description: 'Game name to search for',
            required: true
          },
        ]
      },
      {
        name: SUB_COMMAND.GET,
        type: ApplicationCommandOptionTypes.SUB_COMMAND,
        description: 'Get a specific game',
        options: [
          {
            name: OPTIONS.ID,
            type: ApplicationCommandOptionTypes.STRING,
            description: 'GiantBomb Game ID to get. (Default: Random)',
            required: false,
          }
        ]
      },
      {
        name: SUB_COMMAND.RANDOM,
        type: ApplicationCommandOptionTypes.SUB_COMMAND,
        description: 'Get a random Game'
      }
    ]
  };
};

module.exports.execute = async (client, interaction) => {
  await interaction.deferReply().catch(console.warn);
  // const randGid = Math.floor(Math.random() * 90000);

  const subCommand = interaction.options.getSubcommand();
  console.log(subCommand, interaction.options);
  switch (subCommand) {
  case SUB_COMMAND.SEARCH:
    searchGame(interaction.options.get('name')?.value, (embed) => {
      interaction.editReply({embeds: [embed]}).catch(console.warn);
    });
    break;
  case SUB_COMMAND.GET:
  case SUB_COMMAND.RANDOM:
  default:
    getGame(interaction.options.get(OPTIONS.ID)?.value, (embed) => {
      interaction.editReply({embeds: [embed]}).catch(console.warn);
    });
    break;
  }
};

module.exports.dev = false;
