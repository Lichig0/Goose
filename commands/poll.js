const Discord = require('discord.js');
const Chance = require('chance');
const path = require('path');
const COMMAND_NAME = path.basename(__filename, '.js');

const chance = new Chance();
const inQuotes = new RegExp(/["“]([^"“”]+)["”]/gm);
// const parseERR = 'Bad programmer error.';
const auditHistory = {};
let audit = {};

const PARAMS = {
  QUESTION: 'question',
  OPTION: 'option'
};

exports.help = () => { return '"Question" "options 1" "option 2" "option n..."'; };
exports.audit = () => { return audit; };

exports.run = (message) => {
  const{ content, author, id, guild, channel } = message;
  let audit = {};
  audit.timestamp = Date.now();
  audit.author = author.id;
  audit.id = id;
  const params = audit.matches = content.match(inQuotes);
  console.log(audit);

  if(params == null) {
    return;
  } else if(params.length < 3) {
    params.push('"Yes"', '"No"');
  }

  const [question, ...choices ] = params;
  const emojis = chance.unique(() => chance.pickone([...guild.emojis.cache.values()]), choices.length);
  const choiceMaps = choices.map((choice, i) => {
    return {'c': choice, 'e': emojis[i], s: `${emojis[i]}: ${choice}`};
  });
  const embed = new Discord.MessageEmbed();
  embed.setTitle(question);
  embed.setDescription(choiceMaps.reduce((b, choice) => {
    console.log(choice);
    return b += `${choice.s}\n`;
  },''));
  channel.send(embed).then(sentMessage => {
    choiceMaps.map(choice => {
      sentMessage.react(choice.e).catch(console.error);
    });
    auditHistory[sentMessage.id] = audit;
  }).catch(console.error);
};

exports.execute = async (client, interaction) => {
  const {guild, user, id} = interaction;
  await interaction.deferReply();
  const question = interaction.options.get(PARAMS.QUESTION);
  console.log(interaction.options);
  const choices = interaction.options.data.filter((choice) => choice.name.startsWith(PARAMS.OPTION));
  console.log(question, choices);

  let audit = {};
  audit.timestamp = Date.now();
  audit.author = user.id;
  audit.id = id;
  console.log(audit);

  if(choices.length < 3) {
    choices.push({name: `${PARAMS.OPTION}_a`, type: 'STRING', value:'"Yes"'}, {name: `${PARAMS.OPTION}_b`, type:'STRING', value:'"No"'});
  }

  const emojis = chance.unique(() => chance.pickone([...guild.emojis.cache.values()]), choices.length);
  const choiceMaps = choices.map((choice, i) => {
    return {'c': choice.value, 'e': emojis[i], s: `${emojis[i]}: ${choice.value}`};
  });
  const embed = new Discord.MessageEmbed();
  embed.setTitle(question.value);
  embed.setDescription(choiceMaps.reduce((b, choice) => {
    console.log(choice);
    return b += `${choice.s}\n`;
  },''));
  interaction.editReply({embeds: [embed]}).then(sentMessage => {
    choiceMaps.map(choice => {
      sentMessage.react(choice.e).catch(console.error);
    });
    auditHistory[sentMessage.id] = audit;
  }).catch(console.error);
};

exports.getCommandData = () => {
  const data = {
    name: COMMAND_NAME,
    description: 'Create a poll',
    default_permission: false,
    options: [
      {
        name: PARAMS.QUESTION,
        description: 'Question?',
        required: true,
        type: Discord.Constants.ApplicationCommandOptionTypes.STRING
      }
    ]
  };
  for(let i = 1; i < 10; i++) {
    data.options.push({
      name:`${PARAMS.OPTION}_${i}`,
      description: `Voting option ${i}`,
      type: Discord.Constants.ApplicationCommandOptionTypes.STRING,
      required: false
    });
  }
  return data;
};
exports.dev = false;
