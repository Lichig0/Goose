const path = require('path');
const request = require('request').defaults({ encoding: null });
const { Permissions, MessageEmbed, MessageAttachment, Util } = require('discord.js');
const settings = require('../settings');
const qdb = require('../dbactions/qdbTable');
const COMMAND_NAME = path.basename(__filename, '.js');
const SUBCOMMANDS = {
  FIND: 'find',
  GET: 'get'
};
const PARAMETERS = {
  ADD: 'add',
  LOAD: 'load',
  DELETE: 'delete',
  GET: 'get',
  LIKE: 'like',
  NUMBER: 'number'
};

exports.help = () => 'WIP: QDB feature. Get random quote from QDB archive.\n';

exports.run = (message, epeen) => {
  const { content } = message;
  const admin_perm = epeen.has(Permissions.FLAGS.ADMINISTRATOR) || (message.member.user.id === '341338359807082506');
  const ADD_STRING = `${COMMAND_NAME} add`;
  const LOAD_STRING = `${COMMAND_NAME} load`;
  const DELETE_STRING = `${COMMAND_NAME} delete #`;
  const GET_STRING = `${COMMAND_NAME} #`;
  // const VOTE = `${COMMAND_NAME} vote`;

  const sendCallback = (e, body) => {
    if (e) {
      return console.error(e);
    }
    const quote = body[Math.floor(Math.random() * body.length)];
    if (quote) {
      const embed = new MessageEmbed();
      const { id, body, author_id, notes, tags, created, score, votes, attachment, attachmentUrl } = quote;
      if (attachmentUrl) {
        embed.setImage(attachmentUrl);
      } else if(attachment) {
        const buf = Buffer.from(attachment, 'base64');
        embed.attachFiles(new MessageAttachment(buf));
      }
      embed.setTitle(`Quote #${id}`);
      embed.setDescription(body);
      if (notes) embed.addField('Notes:', notes);
      console.log(score, votes);
      if (score) embed.addField('Score', score, true);
      if (votes) embed.addField('Votes', votes, true);
      embed.addField('Added by', (author_id || 'Anonymous'), true);
      if (tags) embed.setFooter(tags);
      if (created) embed.setTimestamp(new Date(created));
      Util.splitMessage(body).forEach(splitBody => {
        embed.setDescription(splitBody);
        console.log(embed);
        message.channel.send(embed).then((sendMessage => {
          const qid = id;
          const filter = (reaction) => (reaction.emoji.name === '👍' || reaction.emoji.name === '👎');
          const config = settings.qdb || {};
          const time = config.voteTime || 60000;
          sendMessage.react('👍').catch(console.error);
          sendMessage.react('👎').catch(console.error);
          const collector = sendMessage.createReactionCollector(filter, { time });
          collector.on('end', collected => {
            const upVote = collected.get('👍') ? collected.get('👍').count -1 : 0;
            const downVote = collected.get('👎') ? collected.get('👎').count - 1 : 0;
            if (upVote == 0 && downVote == 0) {
              return;
            }
            const results = Number(score) + (upVote - downVote);
            const newVotes = (Number(votes || 0)) + (upVote+downVote);
            const scoreField = embed.fields.find(field=> field.name === 'Score');
            const votesField = embed.fields.find(field => field.name === 'Votes');
            scoreField.value = results;
            votesField.value = newVotes;
            qdb.vote(qid, results, newVotes);
            sendMessage.edit('', {embed}).catch(console.error);
            sendMessage.reactions.removeAll().catch(e => {
              console.error(e);
              sendMessage.react('👍').catch(console.error);
              sendMessage.react('👎').catch(console.error);
            });
            sendMessage.react('✅').catch(console.error);
          });
        })).catch(e => console.error('Failed to send.', e));
      });
    }
  };

  if (content.startsWith(LOAD_STRING, 1) && admin_perm) {
    qdb.load();
  } else if (content.startsWith(ADD_STRING, 1)) {
    const newQuote = content.split(ADD_STRING)[1];
    const addCallback = (entry) => {
      console.log(entry);
      qdb.get(entry.lastID, sendCallback);
    };

    if(message.attachments.size > 0) {
      request.get(message.attachments.first().attachment, function (error, response, body) {
        if (!error && response.statusCode == 200) {
          const d = Buffer.from(body).toString('base64');
          console.log(d);
          qdb.add(newQuote, message, addCallback, message.attachments.first().attachment, d);
        }
      });
    } else {
      qdb.add(newQuote, message, addCallback);
    }
  } else if (content.startsWith(DELETE_STRING,1)) {
    const qid = Number(content.split(DELETE_STRING)[1]);
    qdb.delete(qid, message.author);
  } else if(content.startsWith(GET_STRING, 1)) {
    const qid = Number(content.split(GET_STRING)[1]);
    qdb.get(qid, sendCallback);
  } else if(content.split(COMMAND_NAME)[1].length > 0) {
    qdb.like(content.split(COMMAND_NAME)[1], sendCallback);
  }
  else {
    qdb.get(undefined, sendCallback);
  }
  return;
};

exports.getCommandData = () => {
  return {
    name: COMMAND_NAME,
    description: '(DEV)Acces the Quote Database',
    default_permission: true,
    options: [
      {
        name: 'find',
        description: 'Find a quote in the QDB',
        type: 1,
        options: [
          {
            name: PARAMETERS.LIKE,
            description: 'A word or phrase to look for in a quote text',
            type: 3,
            required:true
          }
        ]
      },
      {
        name: PARAMETERS.GET,
        description: 'Get a specific quote number',
        type: 1,
        options: [
          {
            name: 'number',
            description: 'Quote number',
            type: 4,
            required: true
          }
        ]
      }
      // {
      //   name: 'get',
      //   description: 'Get a quote from QDB',
      //   type: 2,
      //   options: [  
      //   ]
      // }
    ]
  };
};


exports.interact = (interaction, callback) => {
  const sendCallback = (e, body) => {
    if (e) {
      return console.error(e);
    }
    const quote = body[Math.floor(Math.random() * body.length)];
    if (quote) {
      const embed = new MessageEmbed();
      const { id, body, author_id, notes, tags, created, score, votes, attachment, attachmentUrl } = quote;
      if (attachmentUrl) {
        embed.setImage(attachmentUrl);
      } else if(attachment) {
        const buf = Buffer.from(attachment, 'base64');
        embed.attachFiles(new MessageAttachment(buf));
      }
      embed.setTitle(`Quote #${id}`);
      embed.setDescription(body);
      if (notes) embed.addField('Notes:', notes);
      console.log(score, votes);
      if (score) embed.addField('Score', score, true);
      if (votes) embed.addField('Votes', votes, true);
      embed.addField('Added by', (author_id || 'Anonymous'), true);
      if (tags) embed.setFooter(tags);
      if (created) embed.setTimestamp(new Date(created));
      const embeds = [];
      Util.splitMessage(body).forEach(splitBody => {
        embed.setDescription(splitBody);
        // console.log(embed);
        embeds.length < 10 ? embeds.push(embed) : console.warn(`Embeds is large: ${embeds.length}`);
      });
      callback({data:{embeds:embeds}});
    }
  };
  
  // const quoteNumber = interaction.data.options.find(option => option.name === PARAMETERS.QUOTE_NUMBER);
  const subCommand = interaction.data.options[0].name;
  const commandOptions = interaction.data.options[0].options;
  let option = undefined;
  console.log(subCommand, interaction.data.options);
  switch (subCommand) {
  case SUBCOMMANDS.GET:
    option = commandOptions.find(option => option.name === PARAMETERS.NUMBER);
    qdb.get(option.value, sendCallback);
    break;
  case SUBCOMMANDS.FIND:
    option = commandOptions.find(option => option.name === PARAMETERS.LIKE);
    qdb.like(option.value,sendCallback);
    break;
  default:
    qdb.get(undefined, sendCallback);
    console.log(subCommand, commandOptions);
    break;
  }

  return { data: {type: 5}};
  // return { data: {
  //   type: 4,
  //   data: {
  //     content: 'Pong~',
  //     flags: 1 << 6
  //   }}
  // };
};