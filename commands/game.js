const path = require('path');
const { MessageEmbed } = require('discord.js');
const GiantBomb = require('giant-bomb');
const gb = new GiantBomb(process.env.GIANT_BOMB_KEY, 'Goose bot game search for Bounty Board. Retrieve game info for bounties.');

const COMMAND_NAME = path.basename(__filename, '.js');
exports.help = () => {
  return '`game` `game name` \n> `game #game ID`\n> ex: game Super Mario 64\n> game #2931\n';
};
exports.run = (message) => {
  const { content, channel } = message;
  // const admin_perm = epeen.has(Permissions.FLAGS.ADMINISTRATOR) || (message.member.user.id === '341338359807082506');
  const COMMAND = `${COMMAND_NAME} `;
  const GET_STRING = `${COMMAND_NAME} #`;
  const RAND_STRING = `${COMMAND_NAME} ?`;

  if (content.startsWith(GET_STRING, 1) || content.startsWith(RAND_STRING, 1)) {
    const guid = content.startsWith(RAND_STRING, 1) ? Math.floor(Math.random() * 90000) : content.split(GET_STRING)[1] ;
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
      if(response === null) { return channel.send('Not found.').catch(console.warn); }
      const json = JSON.parse(response);
      if (json.status_code !== 1) { return channel.send(json.error).catch(console.warn); }
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

      const embed = new MessageEmbed();
      embed.setTitle(name).setDescription(deck).setURL(site_detail_url);
      embed.setFooter(guid);
      embed.setThumbnail(image.original_url);
      if (original_release_date) embed.addField('Released', original_release_date, true);
      if (!original_release_date) embed.addField('Expected release', `${expected_release_year || '????'} - ${expected_release_month || '??'} - ${expected_release_day || '??'} Q${expected_release_quarter || '?'}`);
      if (aliases) embed.addField('Alias(es)', aliases);
      embed.addFields([
        { name: 'Similar Games', value: similarGames, inline: true },
        { name: 'Platforms', value: plats, inline: true},
        { name: 'Developers', value: devs, inline: true },
        { name: 'Franchise', value: frans, inline: true },
        { name: 'Genres', value: genre, inline: true },
      ]);
      channel.send(embed).catch(console.warn);
    }).catch(console.error);
  } else {
    const gameName = content.split(COMMAND)[1];
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
      if(game === undefined) return channel.send('No result.').catch(console.warn);
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
      embed.addField('Platforms', plats, true);
      if(aliases) embed.addField('Alias(es)', aliases);
      if(original_release_date) embed.addField('Released', original_release_date, true);
      if (!original_release_date) embed.addField('Expected release', `${expected_release_year || '????'} - ${expected_release_month || '??' } - ${expected_release_day || '??'} Q${expected_release_quarter || '?'}`);
      if (otherGames.toString() !== '')embed.addField('More results', otherGames.toString(), true);
      channel.send(embed).catch(console.warn);
    }).catch(console.error);
  }
};