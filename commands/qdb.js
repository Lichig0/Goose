const path = require('path');
const { 
  EmbedBuilder,
  AttachmentBuilder,
  ModalBuilder,
  ActionRowBuilder,
  TextInputStyle,
  TextInputBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
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
  IMAGE_URL: 'imageurl',
  IMAGE: 'image'
};
const TEXT_INPUT_FIELDS = {
  QUOTE: 'quoteInput',
  NOTES: 'notesInput',
  TAGS: 'tagsInput',
};

exports.getCommandData = () => {
  return {
    name: COMMAND_NAME,
    description: 'Access the Quote Database',
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
        description: '(NEW) Add a new quote to the QBD with a MODAL',
        type: 1,
        options: [
          {
            name: PARAMETERS.IMAGE,
            description: 'Image of the quote.',
            type: 11,
            required: false,
          },
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

const sendCallback = (interaction, quote) => {
  if (quote) {
    const embed = new EmbedBuilder();
    const {
      id,
      body,
      author_id,
      notes,
      tags,
      created,
      score,
      votes,
      attachment,
      attachmentUrl
    } = quote;

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
    fields.push({name: 'Added by', value: author_id || 'Anonymous', inline: true});
    embed.addFields(fields);
    if (tags) embed.setFooter({ text: tags});
    if (created) embed.setTimestamp(new Date(created));
    const embeds = [];
    util.splitMessage(body).forEach(splitBody => {
      embed.setDescription(splitBody);
      embeds.length < 9 ? embeds.push(embed) : console.warn(`Embeds is large: ${embeds.length}`);
    });
    interaction.editReply({embeds:embeds}).then(sendMessage => {
      const qid = id;
      const filter = (reaction) => reaction.emoji.name === '👍' || reaction.emoji.name === '👎';
      const config = settings.qdb || {};
      const time = config.voteTime || 60000;
      sendMessage.react('👍').catch(console.error);
      sendMessage.react('👎').catch(console.error);
      const collector = sendMessage.createReactionCollector({filter, time });
      collector.on('end', collected => {
        console.log(collected.get('👍').count ,collected.get('👎').count);
        const upVote = collected.get('👍') ? collected.get('👍').count -1 : 0;
        const downVote = collected.get('👎') ? collected.get('👎').count - 1 : 0;
        const results = Number(score) + (upVote - downVote);
        const newVotes = Number(votes || 0) + (upVote+downVote);
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
    }).catch(e => {
      console.error('Failed to send.', e);
      interaction.editReply('That quote is too powerful.').catch(console.error);
    });
  } else {
    interaction.editReply('I searched and search, I don\'t think that quote exists. Maybe I\'ll make one up next time.').catch(console.error);
  }
};

const addCallback = (interaction, result) => {
  qdb.get(result.lastID, result.guildId).then((result) => sendCallback(interaction, ...result));
};

const deleteCallback = (quoteNumber, interaction) => {
  qdb.get(quoteNumber, interaction.guild.id, (e, body) => {
    if (e) {
      console.error(e);
    }
    const quote = body[0];
    if (quote) return interaction.editReply('Sorry bud. That isn\'t yours to delete.').catch(console.error);
    interaction.editReply('Poof. Gone.').catch(console.error);
  });
};

const quotePicker = (interaction, results) => {
  const buttonRow = new ActionRowBuilder();
  const buttonInteractFilter = (buttonInteract) => {
    return buttonInteract.customId.includes(interaction.id);
  };

  results.length = 8;
  results.forEach(quote => {
    const { id } = quote;
    buttonRow.addComponents(new ButtonBuilder({
      customId: `${interaction.id}_${id}`,
      label: `#${id}: ${quote.body.slice(0,15)}...`,
      style: ButtonStyle.Secondary,
      disabled: false
    }));
  });
  interaction.editReply({content: 'Select a quote', components: [buttonRow]}).catch(console.error);

  const collector = interaction.channel.createMessageComponentCollector({filter: buttonInteractFilter, time: 90000});
  collector.on('collect', async buttonInteract => {
    const qid = buttonInteract.customId.split('_')[1];
    qdb.get(qid, interaction.guild).then((response) => {
      interaction.editReply({components:[]});
      sendCallback(interaction, ...response);
    });
  });
};

exports.execute = async (client, interaction) => {
  const customInteractId = `${interaction.id}`;
  const subCommand = interaction.options.getSubcommand();
  const modal = getAddQuoteModal(customInteractId);
  const commandOptions = interaction.options;
  let option = undefined;

  subCommand === SUBCOMMANDS.ADD ? await interaction.showModal(modal).catch(console.warn) : await interaction.deferReply({ephemeral : !subCommand}).catch(console.warn);

  const {guild} = interaction;


  console.log(subCommand, interaction.options);

  switch (subCommand) {
  case SUBCOMMANDS.GET:
    option = commandOptions.get(PARAMETERS.NUMBER).value;
    qdb.get(option, guild).then((response) => sendCallback(interaction, ...response).catch( e => {
      console.error(e);
      interaction.editReply('I threw up a little.').catch(console.warn);
    }));
    break;
  case SUBCOMMANDS.FIND:
    option = commandOptions.get(PARAMETERS.LIKE).value;
    qdb.like(option, guild).then((response) => response.length > 1 ? quotePicker(interaction, response) : sendCallback(interaction, response[0]).catch(e => {
      console.error(e);
      interaction.editReply('I threw up a little.').catch(console.warn);
    }));
    break;
  case SUBCOMMANDS.ADD:
    interaction.awaitModalSubmit({ filter: ({customId}) => customId === customInteractId, time: 90000 })
      .then(async submitInteraction => {
        await submitInteraction.deferReply();
        console.log(`${submitInteraction.customId} was submitted!`);
        qdb.add(submitInteraction.fields.getTextInputValue(TEXT_INPUT_FIELDS.QUOTE), interaction, {
          notes: submitInteraction.fields.getTextInputValue(TEXT_INPUT_FIELDS.NOTES),
          tags: submitInteraction.fields.getTextInputValue(TEXT_INPUT_FIELDS.TAGS),
          attachment: commandOptions.get(PARAMETERS.IMAGE)?.attachment,
          attachmentUrl: commandOptions.get(PARAMETERS.IMAGE)?.attachment.url
        })
          .then((result) => addCallback(submitInteraction, result))
          .catch(console.error);
      });
    break;
  case SUBCOMMANDS.DELETE:
    qdb.delete(commandOptions.get(PARAMETERS.NUMBER).value, interaction.user).then(() => {
      deleteCallback(commandOptions.get(PARAMETERS.NUMBER).value,
        interaction);
    });
    break;
  default:
    qdb.get(undefined).then(sendCallback);
    console.log(subCommand, commandOptions);
    break;
  }

  return;
};

const getAddQuoteModal = (interactionId) => {
  const modal = new ModalBuilder()
    .setCustomId(interactionId)
    .setTitle('Add Quote');

  const tags = new TextInputBuilder()
    .setCustomId(TEXT_INPUT_FIELDS.TAGS)
    .setLabel('Tags to make this quote easier to find')
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  const notes = new TextInputBuilder()
    .setCustomId(TEXT_INPUT_FIELDS.NOTES)
    .setLabel('Notes to save with the quote')
    .setStyle(TextInputStyle.Short)
    .setRequired(false);  

  const content = new TextInputBuilder()
    .setCustomId(TEXT_INPUT_FIELDS.QUOTE)
    .setLabel('The "Quote" to be remembered.')
    .setStyle(TextInputStyle.Paragraph);

  // An action row only holds one text input,
  // so you need one action row per text input.
  const firstActionRow = new ActionRowBuilder().addComponents(content);
  const secondActionRow = new ActionRowBuilder().addComponents(tags);
  const thirdActionRow = new ActionRowBuilder().addComponents(notes);

  // Add inputs to the modal
  modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);

  return modal;
};

exports.dev = false;
