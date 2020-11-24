const insultTable = require('../dbactions/insultTable');
const Discord = require('discord.js');
const settings = require('../settings');
const insults = [
  'If I cared about what you do on the weekend, I\'d stick a shotgun in my mouth and pull the trigger with my toes.',
  'Swear to God, {member} makes me want to pump nerve gas through the vents.',
  'If I did want a grandchild, I’d just scrape all {member}\'s previous mishaps into a big pile and knit a onesie for it.',
  'So don\'t speak to me. Ever. And while you’re not ever speaking to me; jump up {member}\'s ass and die.',
  'Do I Get Bonus Points If I Act Like I Care?',
  'Don\'t break an arm jerking yourself off.',
  '{member}? It\'s like the n-word and the c-word had a baby and it was raised by all the bad words for Jews.',
  '{member} would suck a dick just to cut in line to suck a bigger dick.',
  'Right now the only thing I want in this world besides for {member} to die of some heretofore unknown form of eyehole cancer is to leave this godforsaken sever!',
  '{member}’s just as full of crap as {member} is chromosomes.',
  'I can envision millions of Americans rising up as one and demanding legislation that would require {member} legs to be amputated, burned, and buried next to Hitler.',
  '{member} won’t truly appreciate the awkwardness of this moment until they’re fondly reminiscing as a 35-year-old homosexual.',
  'Monetize this corkscrewed cock.',
];
exports.help = () => {
  insultTable.get('*', (e, rows) => {
    const numInsults = insults.length + rows.length;
    return `Say an insult! There are ${numInsults} insults.\n`;
  });
  return 'Say an insult; Tag users to target them.';
};

module.exports.run = async message => {
  const { author, content, guild } = message;
  if (content.startsWith('insult add ', 1)) {
    let insult = content.split('insult add ')[1];
    // console.log(insult)
    insultTable.insert(insult, author.id, guild.id, err => {
      if(err) {
        message.react('❌');
      } else {
        message.react('✅');
      }
    });
  }
  else {
    if (message.mentions.members.array().length > 0) {
      message.mentions.members.array().forEach(member => {
        getInsult(message, member);
      });
    } else {
      getInsult(message);
    }
  }
};



const getInsult = function (message, mentioned) {
  const config = settings.settings.insult;
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
    let chat = fullInsults[Math.floor(Math.random() * fullInsults.length)].replace(/\{member\}/gi, replaceMember);
    if (!mentions) chat = Discord.Util.cleanContent(chat, message);
    message.channel.send(chat);
  });
};

const getRandomUsers = function (message) {
  const members = message.channel.members.array();
  return members[Math.floor(Math.random() * members.length)];
};
