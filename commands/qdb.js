const path = require('path');
const request = require('request').defaults({ encoding: null });
const { Permissions, MessageEmbed, MessageAttachment } = require('discord.js');
const settings = require('../settings');
const qdb = require('../dbactions/qdbTable');

const COMMAND_NAME = path.basename(__filename, '.js');

exports.help = () => 'WIP: QDB feature. Get random quote from QDB archive.\n';

exports.run = (message, epeen) => {
  const { content } = message;
  const admin_perm = epeen.has(Permissions.FLAGS.ADMINISTRATOR) || (message.member.user.id === '341338359807082506');
  const ADD_STRING = `${COMMAND_NAME} add`;
  const LOAD_STRING = `${COMMAND_NAME} load`;
  const DELETE_STRING = `${COMMAND_NAME} delete #`;
  const GET_STRRING = `${COMMAND_NAME} #`;
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
            message.react('👍').catch(console.error);
            message.react('👎').catch(console.error);
          });
          sendMessage.react('✅').catch(console.error);
        });
      })).catch(e => console.error('Failed to send.', e));
    }
  };

  if (content.startsWith(LOAD_STRING, 1) && admin_perm) {
    qdb.load();
  } else if (content.startsWith(ADD_STRING, 1)) {
    const newQuote = content.split(ADD_STRING)[1];
    if(message.attachments.size > 0) {
      request.get(message.attachments.first().attachment, function (error, response, body) {
        if (!error && response.statusCode == 200) {
          const d = Buffer.from(body).toString('base64');
          console.log(d);
          qdb.add(newQuote, message, message.attachments.first().attachment, d);
        }
      });
    } else {
      qdb.add(newQuote, message);
    }
  } else if (content.startsWith(DELETE_STRING,1)) {
    const qid = Number(content.split(DELETE_STRING)[1]);
    qdb.delete(qid, message.author);
  } else if(content.startsWith(GET_STRRING, 1)) {
    const qid = Number(content.split(GET_STRRING)[1]);
    qdb.get(qid, sendCallback);
  } else if(content.split(COMMAND_NAME)[1].length > 0) {
    qdb.like(content.split(COMMAND_NAME)[1], sendCallback);
  }
  else {
    qdb.get(undefined, sendCallback);
  }
  return;
};