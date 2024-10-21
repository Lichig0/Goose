const Chance = require('chance');
const Markov = require('word-chains/Markov');
const wiki = require('wikipedia');
const grawlix = require('grawlix');

const TRIMMER = new RegExp('==.*==|\\n|^$', 'g');
const SENTENCE = /(?<sentence>([^.!?]|\d\.\d*)*([.?!](\s+|$)))/gm;

// const minimumScore = 2; // TODO: grab from config
const chance = new Chance();
const markov = new Markov.MarkovChain(2);
grawlix.setDefaults({
  style: {
    name: 'blank',
    char: ''
  }
});
grawlix.loadPlugin('grawlix-racism', {
  style: 'blank'
});
const wikiGenOptions = {
  retries: 50,
  filter: (r) => {
    const length = markov.tokenizer.tokenize(r.string).length;
    return 3 < length && length <= 50;
  }
};

const getWikiDaily = async (times = 1) => {
  for(let i = 0; i <= times; i++) {
    try {
      const events = Object.values(await wiki.onThisDay({type: 'events'}))[0];
      const pageSummary = chance.pickone(Object.values(events)[0].pages);
      const page = await wiki.page(pageSummary.title);
      const content = await page.content();
      return Promise.resolve({
        value: content,
        source: page.canonicalurl,
        toString: () => content,
      });
    } catch (error) {
      console.log(error);
      break;
    }
  }
  return Promise.reject('Failed to fetch daily');
};

const getRandomWiki = async (times = 1) => {
  for(let i = 0; i <= times; i++) {
    try {
      const pageSummary = await wiki.random();
      const page = await wiki.page(pageSummary.title);
      const content = await page.content();
      return Promise.resolve({
        value: content,
        source: page.canonicalurl,
        toString: () => content,
      });
    } catch (error) {
      console.error(error);
      break;
    }
  }
  return Promise.reject('Failed to fetch random');
};

const searchWiki = async (searchText) => {
  return new Promise((resolve, reject) => {
    const contentRequests = [];
    const pageRequests = [];
    const cleanedSearchText = searchText.replace(/[^a-z0-9_-]/gi, ' ').toLowerCase().split(/\s/).slice(0,5).join(' ');
    console.log(`[WIKI] Searching: ${cleanedSearchText}`);
    wiki.search(grawlix(cleanedSearchText)).then(response => {
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
          const searchResults = contentArray.map((content, index) => {
            return {
              value: content.value,
              source: pages[index]?.value?.canonicalurl,
              toString: () => `${content.value}`,
            };
          });
          resolve(searchResults.filter(c=> c.value !== undefined));
        });
      }).catch(reject);
    }).catch((error) => {
      reject(`Failed to search "${searchText}": ${error}`);
    });
  });
  
};

const trimContentToStringArray = function (wikiContent) {
  const trimmed = wikiContent.split(TRIMMER).filter(blocks => blocks !== '');
  const sentences = trimmed.flatMap(block => block.match(SENTENCE)).filter(s => s !== null);
  return sentences;
};

module.exports.addDailyWiki = async () => {
  const wikiContent = await getWikiDaily();
  const sentences = trimContentToStringArray(`${wikiContent.value}`);
  markov.addString(sentences, {source: wikiContent.source, nsfw: false});
};

module.exports.addRandomWiki = async () => {
  const wikiContent = await getRandomWiki();
  const sentences = trimContentToStringArray(`${wikiContent.value}`);
  markov.addString(sentences, {source: wikiContent.source, nsfw: false});
};

module.exports.addSearchedWiki = async (input) => {
  const contentArray = await searchWiki(input).catch(console.error) ?? [];
  const sentenceArray = contentArray.map(({value})=>trimContentToStringArray(value));
  sentenceArray.forEach((sentences, i) => {
    markov.addString(sentences, {source: contentArray[i].source, nsfw: true});
  });
};

module.exports.generateWikiSentence = async (options = wikiGenOptions) => {
  const inputOptions = markov.findInputs(options.input);
  const generators = inputOptions ? inputOptions.map(input => {
    return markov.generateSentence({...options, input});
  }) : [markov.generateSentence(options)];

  const result = await Promise.any(generators);
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
