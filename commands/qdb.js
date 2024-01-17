const path = require('path');
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const settings = require('../settings');
const qdb = require('../dbactions/qdbTable');
const util = require('../chatter/util');
const COMMAND_NAME = path.basename(__filename, '.js');
const SUBCOMMANDS = {
  FIND: 'find',
  GET: 'get',
  DELETE: 'delete',
  ADD: 'add',
  LOAD: 'load'
};
const PARAMETERS = {
  LIKE: 'like',
  NUMBER: 'number',
  CONTENT: 'content',
  NOTES: 'notes',
  TAGS: 'tags',
  IMAGE_URL: 'imageurl'
};

exports.getCommandData = () => {
  return {
    name: COMMAND_NAME,
    description: 'Acces the Quote Database',
    default_permission: true,
    options: [
      {
        name: SUBCOMMANDS.FIND,
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
        name: SUBCOMMANDS.GET,
        description: 'Get a specific quote number',
        type: 1,
        options: [
          {
            name: PARAMETERS.NUMBER,
            description: 'Quote number',
            type: 4,
            required: true
          }
        ]
      },
      {
        name: SUBCOMMANDS.ADD,
        description: 'Add a new quote to the qdb',
        type: 1,
        options: [
          {
            name:PARAMETERS.CONTENT,
            description: 'The "Quote" to be remembered.',
            type: 3,
            required: true
          },
          {
            name: PARAMETERS.NOTES,
            description: 'Notes to save with the quote',
            type: 3,
            required: false
          },
          {
            name: PARAMETERS.IMAGE_URL,
            description: 'Image URL',
            type: 3,
            required: false
          },
          {
            name: PARAMETERS.TAGS,
            description: 'Tags to make this quote easier to find',
            type: 3,
            required: false
          }
        ]
      },
      {
        name: SUBCOMMANDS.DELETE,
        description: 'Delete a quote from the QDB',
        type: 1,
        options: [
          {
            name: PARAMETERS.NUMBER,
            description: 'Number of the quote to be deleted.',
            required: true,
            type: 4
          }
        ]
      }
    ]
  };
};

exports.execute = async (client, interaction) => {
  await interaction.deferReply().catch(console.warn);
  const {guild} = interaction;
  const sendCallback = (e, qbody) => {
    if (e) {
      interaction.editReply('I threw up a little.').catch(console.warn);
      return console.error(e);
    }
    const quote = qbody[Math.floor(Math.random() * qbody.length)];
    if (quote) {
      const embed = new EmbedBuilder();
      const { id, body, author_id, notes, tags, created, score, votes, attachment, attachmentUrl } = quote;
      if (attachmentUrl) {
        embed.setImage(attachmentUrl);
      } else if(attachment) {
        const buf = Buffer.from(attachment, 'base64');
        embed.attachFiles(new AttachmentBuilder(buf));
      }
      embed.setTitle(`Quote #${id}`);
      embed.setDescription(body);
      const fields = [];
      if (notes) fields.push({name: 'Notes:', value: notes});
      if (score) fields.push({name: 'Score', value: score, inline: true});
      if (votes) fields.push({name: 'Votes', value: votes, inline: true});
      fields.push({name: 'Added by', value: (author_id || 'Anonymous'), inline: true});
      embed.addFields(fields);
      if (tags) embed.setFooter({ text: tags});
      if (created) embed.setTimestamp(new Date(created));
      const embeds = [];
      util.splitMessage(body).forEach(splitBody => {
        embed.setDescription(splitBody);
        embeds.length < 9 ? embeds.push(embed) : console.warn(`Embeds is large: ${embeds.length}`);
      });
      interaction.editReply({embeds:embeds}).then((sendMessage => {
        const qid = id;
        const filter = (reaction) => (reaction.emoji.name === '👍' || reaction.emoji.name === '👎');
        const config = settings.qdb || {};
        const time = config.voteTime || 60000;
        sendMessage.react('👍').catch(console.error);
        sendMessage.react('👎').catch(console.error);
        const collector = sendMessage.createReactionCollector({filter,  time });
        collector.on('end', collected => {
          console.log(collected.get('👍').count ,collected.get('👎').count);
          const upVote = collected.get('👍') ? collected.get('👍').count -1 : 0;
          const downVote = collected.get('👎') ? collected.get('👎').count - 1 : 0;
          const results = Number(score) + (upVote - downVote);
          const newVotes = (Number(votes || 0)) + (upVote+downVote);
          const scoreField = embed.fields.find(field=> field.name === 'Score');
          const votesField = embed.fields.find(field => field.name === 'Votes');
          scoreField.value = results;
          votesField.value = newVotes;
          qdb.vote(qid, results, newVotes);
          sendMessage.edit({embed}).catch(console.error);
          sendMessage.reactions.removeAll().catch(e => {
            console.error(e);
            sendMessage.react('👍').catch(console.error);
            sendMessage.react('👎').catch(console.error);
          });
          sendMessage.react('✅').catch(console.error);
        });
      })).catch(e => {
        console.error('Failed to send.', e);
        interaction.editReply('That quote is too powerful.').catch(console.error);
      });
    } else {
      interaction.editReply('I searched and search, I don\'t think that quote exists. Maybe I\'ll make one up next time.').catch(console.error);
    }
  };
  const addCallback = (entry, guildId) => {
    qdb.get(entry.lastID, guildId, sendCallback);
  };
  const deleteCallback = () => {
    const qn = commandOptions.get(PARAMETERS.NUMBER).value;
    qdb.get(qn, guild.id, (e, body) => {
      if (e) {
        console.error(e);
      }
      const quote = body[0];
      if (quote) return interaction.editReply('Sorry bud. That isn\'t yours to delete.').catch(console.error);
      interaction.editReply('Poof. Gone.').catch(console.error);
    });
  };
  const subCommand = interaction.options.getSubcommand();
  const commandOptions = interaction.options;
  let option = undefined;
  console.log(subCommand, interaction.options);
  switch (subCommand) {
  case SUBCOMMANDS.GET:
    option = commandOptions.get(PARAMETERS.NUMBER).value;
    qdb.get(option, guild, sendCallback);
    break;
  case SUBCOMMANDS.FIND:
    option = commandOptions.get(PARAMETERS.LIKE).value;
    qdb.like(option, guild, sendCallback);
    break;
  case SUBCOMMANDS.ADD:
    qdb.add(commandOptions.get(PARAMETERS.CONTENT).value, interaction, addCallback, {
      notes: commandOptions.get(PARAMETERS.NOTES)?.value,
      tags: commandOptions.get(PARAMETERS.TAGS)?.value,
      attachmentUrl: commandOptions.get(PARAMETERS.IMAGE_URL)?.value
    });
    break;
  case SUBCOMMANDS.DELETE:
    qdb.delete(commandOptions.get(PARAMETERS.NUMBER).value, interaction.user, deleteCallback);
    break;
  default:
    qdb.get(undefined, sendCallback);
    console.log(subCommand, commandOptions);
    break;
  }

  return;
};
exports.dev = false;
