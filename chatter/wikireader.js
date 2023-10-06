const Chance = require('chance');
// const Markov = require('markov-strings').default;
const Markov = require('markov-flexible');
const wiki =  require('wikipedia');
const chatterUtil = require('./util');

// eslint-disable-next-line no-control-regex
const TRIMMER = new RegExp('==.*==|\n|^$', 'g');
const PUNCTUATION = new RegExp('[^.!?]*[.!?]', 'g');

const chance = new Chance();
const minimumScore = 2; // TODO: grab from config
const markov = new Markov.MarkovChain(1);
const wikiGenOptions = {
  retries: 750,
  filter: (r) => {
    const goodLength = chatterUtil.wordScore(r.string);
    return goodLength >= minimumScore;
  }
};

const getWikiDaily = async (times = 1) => {
  for(let i = 0; i <= times; i++) {
    try {
      const events = Object.values(await wiki.onThisDay({type: 'events'}))[0];
      const pageSummary = chance.pickone(Object.values(events)[0].pages);
      const page = await wiki.page(pageSummary.title);
      const content = await page.content();
      return(content);
    } catch (error) {
      console.log(error);
      break;
    }
  }
};

const getRandomWiki = async (times = 1) => {
  for(let i = 0; i <= times; i++) {
    try {
      const pageSummary = await wiki.random();
      const page = await wiki.page(pageSummary.title);
      return page.content();
    } catch (error) {
      console.error(error);
      break;
    }
  }
};

const searchWiki = async (searchText) => {
  return new Promise((resolve, reject) => {
    try {
      const contentRequests = [];
      const pageRequests = [];
      wiki.search(searchText).then(response => {
        //Slice to limit requests.
        response.results.slice(0,-6).forEach(result => { 
          pageRequests.push(wiki.page(result.title));
        });

        Promise.allSettled(pageRequests).then(pages => {
          pages.forEach(page => {
            if(page.value) {
              contentRequests.push(page.value.content());
            }
          });

          Promise.allSettled(contentRequests).then(contentArray => {
            resolve(contentArray.map(ca => ca.value).filter(c=> c !== undefined));
          });
        })
      });
    } catch (error){
      reject(error);
    }
  });
  
}

const trimContentToStringArray = function (wikiContent) {
  const trimmed = wikiContent.split(TRIMMER).filter(blocks => blocks !== '');
  const sentences = trimmed.flatMap(block => block.match(PUNCTUATION)).filter(s => s !== null);
  return sentences;
};

module.exports.addDailyWiki = async () => {
  const wikiContent = await getWikiDaily();
  const sentences = trimContentToStringArray(wikiContent);
  markov.addString(sentences);
};

module.exports.addRandomWiki = async () => {
  const wikiContent = await getRandomWiki();
  const sentences = trimContentToStringArray(wikiContent);
  markov.addString(sentences);
};

module.exports.addSearchedWiki = async (input) => {
  const contentArray = await searchWiki(input).catch(console.error);
  const sentences = [];
  contentArray.forEach(content => {
    sentences.push(...trimContentToStringArray(content));
  });
  markov.addString(sentences.filter(s=>typeof s === 'string'), {source: 'Wiki', nsfw: true});
};

module.exports.generateWikiSentence = async (options = wikiGenOptions) => {
  const result = await markov.generateSentence(options);
  return new Promise((resolve, reject) => {
    try {
      result.string = result.text;
      result.refs = Object.values(result.refs);
      resolve(result);
    } catch (e) {
      reject(`Could not generate sentence ${e}`);
    }
  });
};

module.exports.defaultWikiGenerateOptions = wikiGenOptions;