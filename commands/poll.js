const Discord = require('discord.js');
const Chance = require('chance');

const chance = new Chance();
const inQuotes = new RegExp(/["“]([^"“”]+)["”]/gm);
// const parseERR = 'Bad programmer error.';
const auditHistory = {};
let audit = {};

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
  const emojis = chance.unique(() => chance.pickone(guild.emojis.cache.array()), choices.length);
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
