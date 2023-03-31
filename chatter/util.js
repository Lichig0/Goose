

const game = require('../commands/game');
const Chance = require('chance');

const brokenUserIDRegex = new RegExp(/^\s?(<@){0}([0-9]{18})>/i);
const chance = new Chance();

module.exports.wordScore = (markovString, content = '') => {
  let score = 0;

  // Word Count
  const words = markovString.split(/[ ,.!?;()"/]/);
  words.forEach(word => {
    if(!word == '' && !word == ' ') {
      if(content.includes(word)) score++;
    }
  });
  score = score + (-0.03*(words.length-12)^(2)+3);
  return score;
};

module.exports.nsfwCheck = (accumulator, value) => {
  return (accumulator || value.nsfw);
};

module.exports.hasPairs = (str) => {
  const needsPairs = ['"', '||' , '`'];
  // eslint-disable-next-line no-unused-vars
  const reg = new RegExp(/"[^"]*|'[^']*'|`[^`]*`|\([^)]*\)|\|\|[^||]*\|\|/gm);
  let  isPaired = true;

  needsPairs.forEach(char => {
    const splits = str.split(char).length;
    if (splits > 1 && splits % 2 === 0) {
      isPaired = false;
    }
  });
  return isPaired;
};

module.exports.normalizeSentence = (sentence = '') => {
  let resolvedUserNameContent = sentence.replace(brokenUserIDRegex, '<@$2>');
  const capitalized = `${resolvedUserNameContent.replace(resolvedUserNameContent[0], resolvedUserNameContent[0].toUpperCase())}`;
  return (capitalized.endsWith('.') || capitalized.endsWith('?') || capitalized.endsWith('!')) ? capitalized : `${capitalized}.`;
};

module.exports.playGame = (client) => {
  const playGame = chance.bool({likelihoood: 0.4});
  if (playGame) {
    game.getGame((game) => {
      client.user.setActivity(`🎮 ${game.name}`);
    });
  } else {
    client.user.setActivity('👀', { type: 'WATCHING' });
  }
};
