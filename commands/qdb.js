const path = require('path');
const settings = require('../settings');
const { Permissions, MessageEmbed } = require('discord.js');
const qdb = require('../dbactions/qdbTable');

const COMMAND_NAME = path.basename(__filename, '.js');

exports.help = () => 'WIP: QDB feature. Get random quote from QDB archive.\n';

exports.run = (message, epeen) => {
  const { content } = message;
  const admin_perm = epeen.has(Permissions.FLAGS.ADMINISTRATOR) || (message.member.user.id === '341338359807082506');
  if (admin_perm) {
    settings.loadConfig();

    const SET_STRING = `${COMMAND_NAME} load`;
    if (content.startsWith(SET_STRING, 1)) {
      // load the qdb json to db
      qdb.load();
    }
    else {
      qdb.get(5, (e, body)=> {
        if(e) {
          return console.error(e);
        }
        const quote = body[Math.floor(Math.random() * body.length)];
        if (quote) {
          const embed = new MessageEmbed();
          const {id, body, notes, tags, created, score, votes } = quote;
          embed.addField('Quote:', body);
          embed.setTitle(`#${id}`);
          if (notes) embed.addField('Notes:', notes);
          // if (score) embed.addField('Score:', score);
          // if (votes) embed.addField('Votes:', votes);
          if (tags) embed.setFooter(tags);
          if(created) embed.setTimestamp(new Date(created));
          message.channel.send(embed).catch(e => console.error('Failed to send.', e));
        }
      });
    }
  }
  return;
};