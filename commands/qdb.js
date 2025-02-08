const path = require('path');
const { 
  EmbedBuilder,
  AttachmentBuilder,
  ModalBuilder,
  ActionRowBuilder,
  TextInputStyle,
  TextInputBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
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
const PREVIOUS = 'previous';
const NEXT = 'next';
const SELECT = 'select';

const PREVIOUS_BUTTON = new ButtonBuilder({
  label: '⏮️',
  style: ButtonStyle.Secondary,
  disabled: false,
});

const NEXT_BUTTON = new ButtonBuilder({
  label: '⏭️',
  style: ButtonStyle.Secondary,
  disabled: false,
});

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

const sendQuote = (interaction, quote) => {
  if (quote) {
    const embed = new EmbedBuilder();
    const actionRow = new ActionRowBuilder();
    const fields = [];
    const pages = [];
    let page = 1;
    const buttonInteractFilter = (buttonInteract) => {
      return buttonInteract.customId.includes(interaction.id) && interaction.member.id === buttonInteract.user.id;
    };
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
    if (notes) fields.push({name: 'Notes:', value: notes});
    if (score) fields.push({name: 'Score', value: score, inline: true});
    if (votes) fields.push({name: 'Votes', value: votes, inline: true});
    fields.push({name: 'Added by', value: author_id ?? 'Anonymous', inline: true});
    embed.addFields(fields);
    if (tags) embed.setFooter({ text: tags});
    if (created) embed.setTimestamp(new Date(created));
    util.splitMessage(body).forEach(splitBody => {
      if(splitBody !== '') {
        pages.push(splitBody);
      }
    });
    if(pages.length > 1) {
      pages.next = () => pages.push(pages.shift());
      pages.previous = () => pages.unshift(pages.pop());
      embed.setDescription(pages[0]).setTitle(`Quote #${id} (Page ${page}/${pages.length})`);
      actionRow
        .addComponents(PREVIOUS_BUTTON.setCustomId(`${interaction.id}_${PREVIOUS}`).setDisabled(false))
        .addComponents(NEXT_BUTTON.setCustomId(`${interaction.id}_${NEXT}`));
    } else {
      embed.setDescription(body);
    }
    const collector = interaction.channel.createMessageComponentCollector({filter: buttonInteractFilter, time: 90000});
    collector.on('collect', buttonInteract => {
      const buttonId = buttonInteract.customId.split('_')[1];
      if(buttonId === NEXT) {
        pages.next();
        page === pages.length ? page = 1 : page++;
        buttonInteract.update({embeds:[embed.setDescription(pages[0]).setTitle(`Quote #${id} (Page ${page}/${pages.length})`)]});
      } else if (buttonId === PREVIOUS) {
        pages.previous();
        page === 1 ? page = pages.length : page--;
        buttonInteract.update({embeds:[embed.setDescription(pages[0]).setTitle(`Quote #${id} (Page ${page}/${pages.length})`)]});
      }
    });
    collector.on('end', () => {
      interaction.editReply({components:[]}).catch(console.warn);
    });
    interaction.editReply({embeds:[embed], components: pages.length > 1 ? [actionRow] : []})
      .then(sendMessage => {
        const qid = id;
        const filter = (reaction) => reaction.emoji.name === '👍' || reaction.emoji.name === '👎';
        const config = settings.qdb || {};
        const time = config.voteTime || 60000;
        sendMessage.react('👍').catch(console.error);
        sendMessage.react('👎').catch(console.error);
        const collector = sendMessage.createReactionCollector({filter, time });
        collector.on('end', collected => {
          console.log(collected.get('👍')?.count ,collected.get('👎')?.count);
          const upVote = collected.get('👍')?.count -1 ?? 0;
          const downVote = collected.get('👎')?.count - 1 ?? 0;
          const results = Number(score) + (upVote - downVote);
          const newVotes = Number(votes || 0) + (upVote+downVote);
          const scoreField = embed.data.fields.find(field=> field.name === 'Score');
          const votesField = embed.data.fields.find(field => field.name === 'Votes');
          scoreField.value = results;
          votesField.value = newVotes;
          qdb.vote(qid, results, newVotes);
          sendMessage.edit({embeds: [embed]}).catch(console.error);
          sendMessage.reactions.removeAll()
            .then(() => {
              sendMessage.react('✅').catch(console.error);
            })
            .catch(e => {
              console.error(e);
              sendMessage.react('👍').catch(console.error);
              sendMessage.react('👎').catch(console.error);
            });
          
        });
      })
      .catch(e => {
        console.error('Failed to send.', e);
        interaction.editReply('Don\'t look.').catch(console.error);
      });
  } else {
    interaction.editReply('Try your other words.').catch(console.error);
  }
};

const addQuote = (interaction, result) => {
  qdb.get(result.lastID, result.guildId)
    .then((result) => sendQuote(interaction, ...result))
    .catch(() => interaction.editReply('I made a mistake in the DB.'));
};

const deleteResponse = (interaction, quoteNumber) => {
  qdb.get(quoteNumber, interaction.guild.id)
    .then((results) => {
      const quote = results[0];
      if (quote) return interaction.editReply('Sorry bud. That isn\'t yours to delete.').catch(console.error);
      interaction.editReply('Poof. Gone.').catch(console.error);
    })
    .catch(() => {
      interaction.editReply('404');
    });
};

const quotePicker = async (interaction, results) => {
  const selectorRow = new ActionRowBuilder();
  const quotesList = new EmbedBuilder();
  const fields = [];
  const menuOptions = [];
  const replyData = {
    content: '',
    components: [],
    embeds: [],
  };

  const buttonInteractFilter = (buttonInteract) => {
    return buttonInteract.customId.includes(interaction.id) && interaction.member.id === buttonInteract.user.id;
  };
  const collector = interaction.channel.createMessageComponentCollector({
    filter: buttonInteractFilter,
    time: 90000
  });

  await interaction.editReply({content: `Found ${results.length} matches...`});
  
  results.forEach(quote => {
    const { id, attachmentUrl } = quote;
    fields.push({
      name: `QID: #${id}`,
      value:`${quote.body.slice(0, 30)} ${attachmentUrl ? '<img>' : ''}`,
      inline: true
    });
    menuOptions.push(new StringSelectMenuOptionBuilder()
      .setDescription(`${quote.body.slice(0, 30)} ${attachmentUrl ? '<img>' : ''}`)
      .setLabel(`#${id}`)
      .setValue(`${id}`)
    );
  });
  if(results.length > 25) {
    sendQuote(interaction); // send no quote; ask for different input
  }
  else if(results.length > 1) {
    replyData.content = `Found ${results.length} matches...`;
    replyData.components = [
      selectorRow.addComponents(new StringSelectMenuBuilder()
        .setCustomId(`${interaction.id}_${SELECT}`)
        .setPlaceholder('Select a quote')
        .addOptions(menuOptions))
    ];
    replyData.embeds = [
      quotesList.setFields(fields)
    ];
  } else {
    replyData.embeds = [
      quotesList.setFields(fields)
    ];
  }
  interaction.editReply(replyData).catch(console.error);
 
  collector.on('collect', async buttonInteract => {
    const command = buttonInteract.customId.split('_')[1];
    switch(command) {
    case SELECT:
      qdb.get(buttonInteract.values[0], interaction.guild).then((response) => {
        collector.stop();
        buttonInteract.update({content:'', components:[]}).then(() => {
          sendQuote(buttonInteract, ...response);
        });
      });
      return;
    }
  });
};

exports.execute = async (client, interaction) => {
  const customInteractId = `${interaction.id}`;
  const subCommand = interaction.options.getSubcommand();
  const commandOptions = interaction.options;
  let option = undefined;

  if (subCommand === SUBCOMMANDS.ADD) {
    await interaction.showModal(getAddQuoteModal(customInteractId)).catch(console.warn);
  } else {
    await interaction.deferReply().catch(console.warn);
  }

  const {guild} = interaction;

  console.log(subCommand, interaction.options);

  switch (subCommand) {
  case SUBCOMMANDS.GET:
    option = commandOptions.get(PARAMETERS.NUMBER).value;
    qdb.get(option, guild)
      .then((response) => sendQuote(interaction, ...response))
      .catch( e => {
        console.error(e);
        interaction.editReply('I threw up a little.').catch(console.warn);
      });
    break;
  case SUBCOMMANDS.FIND:
    option = commandOptions.get(PARAMETERS.LIKE).value;
    qdb.like(option, guild)
      .then((response) => {
        if(response.length > 1) {
          quotePicker(interaction, response);
        } else {
          sendQuote(interaction, response[0]);
        }
      })
      .catch(e => {
        console.error(e);
        interaction.editReply('I threw up a little.');
      });
    break;
  case SUBCOMMANDS.ADD:
    interaction.awaitModalSubmit({ filter: ({customId}) => customId === customInteractId, time: 90000 })
      .then(async submitInteraction => {
        await submitInteraction.deferReply();
        const {
          fields,
          customId,
        } = submitInteraction;
              
        console.log(`${customId} was submitted!`);

        qdb.add(fields.getTextInputValue(TEXT_INPUT_FIELDS.QUOTE), interaction, {
          notes: fields.getTextInputValue(TEXT_INPUT_FIELDS.NOTES),
          tags: fields.getTextInputValue(TEXT_INPUT_FIELDS.TAGS),
          attachment: commandOptions.get(PARAMETERS.IMAGE)?.attachment,
          attachmentUrl: commandOptions.get(PARAMETERS.IMAGE)?.attachment.url
        })
          .then((result) => addQuote(submitInteraction, result))
          .catch(console.error);
      }).catch(console.warn);
    break;
  case SUBCOMMANDS.DELETE:
    qdb.delete(commandOptions.get(PARAMETERS.NUMBER).value, interaction.user)
      .then(() => {
        deleteResponse(interaction, commandOptions.get(PARAMETERS.NUMBER).value);
      });
    break;
  default:
    qdb.get(undefined).then(() => sendQuote(interaction));
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
