
const brokenUserIDRegex = new RegExp(/^\s?(<@){0}([0-9]{18})>/i);

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
  needsPairs.forEach(char => {
    if (str.split(char).length % 2 === 1) {
      return false;
    }
  });
  return true;
};

module.exports.normalizeSentence = (sentence = '') => {
  let resolvedUserNameContent = sentence.replace(brokenUserIDRegex, '<@$2>');
  const capitalized = `${resolvedUserNameContent.replace(resolvedUserNameContent[0], resolvedUserNameContent[0].toUpperCase())}`;
  return (capitalized.endsWith('.') || capitalized.endsWith('?') || capitalized.endsWith('!')) ? capitalized : `${capitalized}.`;
};
