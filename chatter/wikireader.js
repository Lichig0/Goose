const Chance = require('chance');
const Markov = require('markov-strings').default;
const wiki =  require('wikipedia');
const chatterUtil = require('./util');

const TRIMMER = new RegExp('==.*==|\n|^$', 'g');
const PUNCTUATION = new RegExp('[^.!?]*[.!?]', 'g');

const chance = new Chance();
const markov = new Markov({ stateSize: 2 });
const minimumScore = 2; // TODO: grab from config
const wikiGenOptions = {
  maxTries: 10,
  filter: (r) => {
    const multiRef = r.refs.length;
    const goodLength = chatterUtil.wordScore(r.string);
    return (multiRef + goodLength) >= minimumScore && !r.refs.includes(r.string);
  }
};

const getWikiDaily = async() => {
  try {
    const events = Object.values(await wiki.onThisDay({type: 'events'}))[0];
    const pageSummary = chance.pickone(Object.values(events)[0].pages);
    const page = await wiki.page(pageSummary.title);
    const content = await page.content();
    return(content);
  } catch (error) {
    console.log(error);
  }
};

const getRandomWiki = async () => {
  try {
    const pageSummary = await wiki.random();
    const page = await wiki.page(pageSummary.title);
    return page.content();
  } catch (error) {
    console.error(error);
  }
};

const trimContentToStringArray = function (wikiContent) {
  const trimmed = wikiContent.split(TRIMMER).filter(blocks => blocks !== '');
  const sentences = trimmed.flatMap(block => block.match(PUNCTUATION)).filter(s => s !== null);
  return sentences;
};

module.exports.addDailyWiki = async () => {
  const wikiContent = await getWikiDaily();
  const sentences = trimContentToStringArray(wikiContent);
  markov.addData(sentences);
};

module.exports.addRandomWiki = async () => {
  const wikiContent = await getRandomWiki();
  const sentences = trimContentToStringArray(wikiContent);
  markov.addData(sentences);
};

module.exports.generateWikiSentence = (options = wikiGenOptions) => {
  return new Promise((resolve, reject) => {
    try {
      const sentence = markov.generate(options);
      resolve(sentence);
    } catch (e) {
      reject(`Could not generate sentence ${e}`);
    }
  });
};
