const insultTable = require('../dbactions/insultTable');
const Discord = require('discord.js');
const settings = require('../settings');
const Chance = require('chance');
const path = require('path');
const COMMAND_NAME = path.basename(__filename, '.js');
const SUBCOMMANDS = {
  ADD: 'add',
  GET: 'get',
  DELETE: 'delete',
};
const PARAMETERS = {
  INSULT: 'insult',
  MENTION: 'mention',
};

const chance = new Chance();
const insults = [
  'If I cared about what you do on the weekend, I\'d stick a shotgun in my mouth and pull the trigger with my toes.',
  'Swear to God, {member} makes me want to pump nerve gas through the vents.',
  'If I did want a grandchild, I’d just scrape all {member}\'s previous mishaps into a big pile and knit a onesie for it.',
  'So don\'t speak to me. Ever. And while you’re not ever speaking to me; jump up {member}\'s ass and die.',
  'Do I get bonus points if I act like I care?',
  'Don\'t break an arm jerking yourself off.',
  '{member}? It\'s like the n-word and the c-word had a baby and it was raised by all the bad words for Jews.',
  '{member} would suck a dick just to cut in line to suck a bigger dick.',
  'Right now the only thing I want in this world besides for {member} to die of some heretofore unknown form of eyehole cancer is to leave this godforsaken sever!',
  '{member}’s just as full of crap as {member} is brain worms.',
  'I can envision millions of Americans rising up as one and demanding legislation that would require {member} legs to be amputated, burned, and buried next to Hitler.',
  '{member} won’t truly appreciate the awkwardness of this moment until they’re fondly reminiscing as a 35-year-old homosexual.',
  'Monetize this corkscrewed cock.',
  'Please stop talking.',
  'What is this, amature hour?',
];
const auditHisotry = {};
let audit = {};

const getInsult = function (callback, message, mentioned) {
  const config = settings.settings;
  const mentions = config.mentions || false;

  const replaceMember = (match, offset, string) => {
    if (mentioned && string.indexOf(match) === offset) {
      return mentioned;
    }
    return getRandomUsers(message);
  };

  insultTable.get(message.guild, (e, rows) => {
    const fullInsults = insults;
    rows.forEach(item => fullInsults.push(item.insult));
    let chat = chance.pickone(fullInsults).replace(/\{member\}/gi, replaceMember);
    // let chat = fullInsults[Math.floor(Math.random() * fullInsults.length)].replace(/\{member\}/gi, replaceMember);
    if (!mentions) chat = Discord.Util.cleanContent(chat, message);
    callback(chat);
  });
};

const getRandomUsers = (message) => {
  const members = [...message.guild.channels.cache.get(message.channelId)?.members?.values()];
  return members[Math.floor(Math.random() * members.length)];
};

exports.execute = async (client, interaction) => {
  await interaction.deferReply();

  const { user, options, guild, } = interaction;
  if (options.getSubcommand() == SUBCOMMANDS.ADD) {
    let insult = options.get(PARAMETERS.INSULT);
    insultTable.insert(insult, user.id, guild.id, err => {
      if(err) {
        interaction.editReply('Failed to add insult. I didn\t fail, you did.').catch(console.error);
      } else {
        interaction.editReply('Added. Someone hates you for that.').catch(console.error);
      }
    });
  }
  else {
    const mentionable = options.get(PARAMETERS.MENTION);
    const a = audit;
    const reply = (text) => {
      interaction.editReply(text, options).then((sentMessage) => {
        a.timestamp = Date.now();
        auditHisotry[sentMessage.id] = a;
      }).catch(console.error);
    };
    if (mentionable) {
      const members = mentionable.role ? [...mentionable.role.members.values()] : [mentionable.member];
      members.map(member => {
        getInsult(reply, interaction, member);
      });
    } else {
      getInsult(reply, interaction);
    }
  }
};

exports.getCommandData = () => {
  return {
    name: COMMAND_NAME,
    description: 'Say an insult, maybe even drop a mention?',
    options: [
      {
        name: SUBCOMMANDS.ADD,
        description: 'Add an insult.',
        type: Discord.Constants.ApplicationCommandOptionTypes.SUB_COMMAND,
        options: [
          {
            name: PARAMETERS.INSULT,
            description: 'Come up with an insult. Try using `{member}` in place of someone\'s name',
            type: Discord.Constants.ApplicationCommandOptionTypes.STRING,
            required: true
          }
        ]
      },
      {
        name: SUBCOMMANDS.GET,
        description: 'Say an insult.',
        type: Discord.Constants.ApplicationCommandOptionTypes.SUB_COMMAND,
        options: [
          {
            name: PARAMETERS.MENTION,
            description: 'Insult who now?',
            type: Discord.Constants.ApplicationCommandOptionTypes.MENTIONABLE,
            required: false,
          }
        ]
      }
    ]
  };
};

exports.dev = false;
exports.getInsult = getInsult;
