/*
id INTEGER PRIMARY KEY,
    assignee TEXT NOT NULL,
    game TEXT NOT NULL,
    requirement TEXT NOT NULL,
    reward REAL NOT NULL,
    optCondition TEXT,
    optReward REAL,
    status TEXT NOT NULL,
    guild TEXT NOT NULL)`
*/

/*
Bounty {
    id: uuid!
    assignee: discord uuid!
    game: giant bomb api uuid! ???
    requirement: string!
    reward: double!
    optional condition: string?
    optional reward: double?
    status: enum! [open, in progress, closed]
}
*/

/*
.bounty | game name [hit search API, return first result] | condition | reward | optional requirement: [use keyword optional] | optional reward: [use keyword optional]
.bounty ListOpen, .bounty ListClosed, .bounty ListClaimed, .bounty Claim
.bounty Complete .bounty Failed .bounty Details {id}
*/



const path = require('path');
const { MessageEmbed, MessageActionRow, MessageButton, Constants: {ApplicationCommandOptionTypes}, Constants } = require('discord.js');
const GiantBomb = require('giant-bomb');
const bbt = require('../dbactions/bountyBoardTable');
const settings = require('../settings');
const gb = new GiantBomb(process.env.GIANT_BOMB_KEY, 'Goose bot Bounty Board. Retrieve game info for bounties.');

const COMMAND_NAME = path.basename(__filename, '.js');
const SUBCOMMANDS = {
  FIND: 'find',
  ADD: 'add',
  LIST: 'list',
  DELETE: 'delete',
};
const PARAMETERS = {
  LIKE: 'like',
  // NUMBER: 'number',
  // CONTENT: 'content',
  // NOTES: 'notes',
  // TAGS: 'tags'
};

exports.help = () => {
  let help = 'Game Bounty Board.(WIP)\n';
  help += '> `add` `game name` | `condition` | `$(5-20)` | `expireTime(dd/mm/yyyy)` | `optional condition` | `reward for optional condition` (WIP)\n';
  help += '> `list` lists bounties\n';
  help += '> `claim` `game name` claim a bounty\n';
  help += '> `rules` show bounty rules\n';
  help += '> `complete` (WIP) not implemented\n';
  help += '> `failed` (WIP) not implemented\n';
  help += '> `delete #`bounty number` delete your bounty (WIP)\n';
  return help;
};
/*
  .bounty | game name [hit search API, return first result] | condition | reward | optional requirement: [use keyword optional] | optional reward: [use keyword optional]
  .bounty ListOpen, .bounty ListClosed, .bounty ListClaimed, .bounty Claim
  .bounty Complete .bounty Failed .bounty Details {id}
  */
exports.run = (message) => {
  const { content, channel, author } = message;
  // const admin_perm = epeen.has(Permissions.FLAGS.ADMINISTRATOR) || (message.member.user.id === '341338359807082506');
  const COMMAND = `${COMMAND_NAME} `;
  const ADD = `${COMMAND_NAME} add `;
  const LIST = `${COMMAND_NAME} list`;
  const RULES = `${COMMAND_NAME} rules`;
  const CLAIM = `${COMMAND_NAME} claim `;
  const COMPLETE = `${COMMAND_NAME} complete `;
  const FAILED = `${COMMAND_NAME} failed `;
  const DELETE = `${COMMAND_NAME} delete #`;

  const sendBountyCallback = (e, data) => {
    if(e) {
      return console.error(e);
    }
    if(data.length > 0) {
      const bounty = new Bounty(data[0]);
      const embed = bounty.generateEmbed();
      message.channel.send({embeds: [embed]}).catch(console.warn);
    }
  };

  if (content.startsWith(ADD, 1)) {
    const config = settings.settings.bounty || {minReward: 5, maxReward: 20};
    const command = content.split(ADD)[1];
    const commandOptions = command.split(/[|]/);
    commandOptions.forEach((value, index) => commandOptions[index] = value.trim());
    const [gameName, condition, reward, expires] = commandOptions;
    const rewardValue = (reward.split('$')[reward.split('$').length-1]);
    const options = {
      query: gameName,
      fields: ['name','guid','image'],
      resources: ['game']
    };
    if (!(gameName && condition && reward && expires)) {
      return channel.send('Name, Condition, reward, and expiration date all required')
        .catch(console.warn);
    } else if ( config.minReward > rewardValue && rewardValue > config.maxReward ) {
      return channel.send(`Reward is not withing the required limits. ${config.minReward} > ${reward} > ${config.maxReward}`)
        .catch(console.warn);
    }
    gb.search(options).then(response => {
      const j = JSON.parse(response);
      const game = j.results[0];
      bbt.add(game, message, commandOptions, (lastID) => {
        bbt.get(lastID, sendBountyCallback);
      });
      // console.log(`${game.name} is available on ${game.platforms.length + (game.platforms.length > 1 ? ' platforms.' : ' platform.')}`);
      // channel.send(embed).catch(console.warn);
    }).catch(console.error);
  } else if (content.startsWith(LIST, 1)){
    bbt.list((e, rows) => {
      if(rows.length < 1) channel.send('There are no bounties.').catch(console.warn);
      const embed = new MessageEmbed();
      rows.forEach(row => {
        const { id, gameName, reward, optReward, assigneeId } = row;
        const b = new Bounty(row);
        embed.addField(`#${id}:${gameName}`, `${b.STATUS[b.status]}  |  ${reward}  |  ${optReward || 'None'} ${assigneeId ? '  |  '+assigneeId : ''} `);
      });
      channel.send({embeds: [embed]}).catch(console.warn);
    });
    return channel.send('Not implemented.').catch(console.warn);
  } else if (content.startsWith(CLAIM, 1)) {
    // assign bounty to member if not already assigned
    const search = content.split(CLAIM)[1];
    bbt.like(search, (e, data) => {
      if(e) return console.warn(e);
      if(data.length === 1) {
        // Check if assigned
        const bounty = new Bounty(data[0]);
        if (bounty.assignee) {
          channel.send(`Bounty already claimed by ${bounty.assignee}`).catch(console.warn);
        } else if (bounty.author === author.toString()) {
          channel.send('Rule #6 Cannot assign yourself to your own bounty. `See: bounty rules`').catch(console.warn);
        }else {
          bbt.assign(bounty.id, author, (e, data) => {
            if (e) return console.warn(e);
            console.log(data);
          });
        }
      } else {
        channel.send(`Refine your search. ${data.length} game(s) found.`)
          .catch(console.warn);
      }
    });
    return channel.send('Not implemented.').catch(console.warn);
  } else if (content.startsWith(COMPLETE, 1)) {
    // if owner of bounty, can mark bounty for completion
    return channel.send('Not implemented.').catch(console.warn);
  } else if (content.startsWith(FAILED, 1)) {
    // if owner of bounty, can mark bounty for failure
    return channel.send('Not implemented.').catch(console.warn);
  } else if(content.startsWith(RULES, 1)) {
    return channel.send('```'+
      '#1 Users cannot remove bounties made by others\n'+
      '#2 Users cannot take more than 1 bounty\n'+
      '#3 Users can remove their own bounties\n'+
      '#4 Users can fail a bounty\n'+
      '#5 Failed bounties cannot be reopened\n'+
      '#6 Users cannot assign themselves to their own bounties\n'+
      '#7 Users cannot accept bounties for games they beat as a kid and know how to meme\n'+
      '#8 Minimum dollar amount: $5\n'+
      '#9 Maximum dollar amount: $20\n'+
      '```')
      .catch(console.warn);
  } else if(content.startsWith(DELETE, 1)) {
    const bid = Number(content.split(DELETE)[1]);
    bbt.delete(bid, message.author);
  } else {
    //help or search
    bbt.like(content.split(COMMAND)[1], sendBountyCallback);
    return channel.send('Not implemented.').catch(console.warn);
  }
  return;
};
exports.getCommandData = () => {
  return {
    name: COMMAND_NAME,
    description: 'Game Bounty Board(WIP)',
    default_permission: false,
    options: [
      {
        name: SUBCOMMANDS.FIND,
        description: 'Find a specific bounty',
        type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND,
        options: [
          {
            name: PARAMETERS.LIKE,
            description: 'Name of the game that has a bounty',
            type: ApplicationCommandOptionTypes.STRING,
            required: true
          }
        ]
      },
      {
        name: SUBCOMMANDS.LIST,
        description: 'List the bounties',
        type: ApplicationCommandOptionTypes.SUB_COMMAND
      }
    ]
  };
};

exports.execute = async (client, interaction) => {
  await interaction.deferReply();
  const sendBountyCallback = (e, data) => {
    if(e) {
      return console.error(e);
    }
    if(data.length > 0) {
      const bounty = new Bounty(data[0]);
      const embed = bounty.generateEmbed();
      const row = new MessageActionRow().addComponents(new MessageButton().setCustomId('claim').setLabel('Claim').setStyle('PRIMARY').setDisabled(true));
      interaction.editReply({embeds: [embed], components: [row]}).catch(console.warn);
    }
  };

  const subCommand = interaction.options.getSubcommand();
  const commandOptions = interaction.options;
  switch (subCommand) {
  case SUBCOMMANDS.FIND:
    //help or search
    bbt.like((commandOptions.get[PARAMETERS.LIKE].value), sendBountyCallback);
    break;
  case SUBCOMMANDS.LIST:
  default:
    bbt.list((e, rows) => {
      if(rows.length < 1) return interaction.editReply('There are no bounties.').catch(console.warn);
      const embed = new MessageEmbed();
      rows.forEach(row => {
        const { id, gameName, reward, optReward, assigneeId } = row;
        const b = new Bounty(row);
        embed.addField(`#${id}:${gameName}`, `${b.STATUS[b.status]}  |  ${reward}  |  ${optReward || 'None'} ${assigneeId ? '  |  '+assigneeId : ''} `);
      });
      interaction.editReply({embeds: [embed]}).catch(console.warn);
    });
    console.log(subCommand, commandOptions);
    break;
  }
};

exports.dev = true;


class Bounty { // This whole thing is messy
  constructor(bo) {
    this.STATUS = ['Open', 'In Progress', 'Completed', 'Failed', 'Closed'];

    this.id = bo.id;
    this.guid = bo.guid;
    this.name = bo.gameName;
    this.assignee = bo.assigneeId;
    this.author = bo.authorId;
    this.condition = bo.condition;
    this.reward = bo.reward;
    this.expireDate = bo.expireDate;
    this.postedDate = bo.postDate;
    this.optionalCondition = bo.optCondition;
    this.optionalReward = bo.optReward;
    this.status = bo.status;
    this.thumb_url = bo.thumbUrl;
    this.guild = bo.guild;
  }
  generateEmbed() {
    const embed = new MessageEmbed();
    embed.setColor(this.statusColor());
    embed.setTitle(`Bounty #${this.id}: ${this.name}`);
    if (this.thumb_url) embed.setThumbnail(this.thumb_url);
    embed.setFooter(this.guid);
    embed.addField('Condition:', this.condition);
    embed.addField('Reward', this.reward);
    if (this.optionalCondition) embed.addField('*Optional* Condition', this.optionalCondition);
    if (this.optionalReward) embed.addField('*Optional* Reward', this.optionalReward);
    embed.addField('Status', this.STATUS[this.status]);
    if (this.expireDate)embed.addField('Expires', new Date(this.expireDate));
    if (this.assignee) embed.addField('Taken by: ', this.assignee);
    embed.addField('Posted by: ', this.author);
    embed.setTimestamp(Date(this.postedDate));
    return embed;
  }
  statusColor() {
    switch(this.status) {
    case 0:
      return '#00ccff';
    case 1:
      return '#ff9933';
    case 2:
      return '#33cc33';
    case 3:
      return '##cc0000';
    case 4:
    default:
      return '#ffffff';
    }
  }
}
