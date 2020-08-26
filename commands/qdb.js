const path = require('path');
const { Permissions, MessageEmbed } = require('discord.js');
const qdb = require('../dbactions/qdbTable');

const COMMAND_NAME = path.basename(__filename, '.js');

exports.help = () => 'WIP: QDB feature. Get random quote from QDB archive.\n';

exports.run = (message, epeen) => {
  const { content } = message;
  const admin_perm = epeen.has(Permissions.FLAGS.ADMINISTRATOR) || (message.member.user.id === '341338359807082506');
  const ADD_STRING = `${COMMAND_NAME} add`;
  const LOAD_STRING = `${COMMAND_NAME} load`;
  const GET_STRRING = `${COMMAND_NAME} #`;
  // const VOTE = `${COMMAND_NAME} vote`;

  const sendCallback = (e, body) => {
    if (e) {
      return console.error(e);
    }
    const quote = body[Math.floor(Math.random() * body.length)];
    if (quote) {
      const embed = new MessageEmbed();
      const { id, body, author_id, notes, tags, created, score, votes } = quote;
      embed.setTitle(`Quote #${id}`);
      embed.setDescription(body);
      if (notes) embed.addField('Notes:', notes);
      console.log(score, votes);
      if (score) embed.addField('Score', score, true);
      if (votes) embed.addField('Votes', votes, true);
      if (author_id) embed.addField('Added by', author_id, true);
      if (tags) embed.setFooter(tags);
      if (created) embed.setTimestamp(new Date(created));
      message.channel.send(embed).catch(e => console.error('Failed to send.', e));
    }
  };

  if (content.startsWith(LOAD_STRING, 1) && admin_perm) {
    qdb.load();
  } else if (content.startsWith(ADD_STRING, 1)) {
    const newQuote = content.split(ADD_STRING)[1];
    qdb.add(newQuote, message);
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