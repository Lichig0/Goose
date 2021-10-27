const Twitter = require('twitter-v2');
const entities = require('entities');
const Markov = require('markov-strings').default;
const Chance = require('chance');
const chatterUtil = require('./util');
const chance = new Chance();
const client = new Twitter({
  bearer_token: process.env.TWITTER_BEARER_TOKEN
});
const recordedTweets = [];
let markov = new Markov({ stateSize: 2 });
let connectionRetries = 0;
const minimumScore = 2; // TODO: Grab from config
const twitterGenOptions = {
  maxTries: 10,
  filter: (r) => {
    const multiRef = r.refs.length;
    const goodLength = chatterUtil.wordScore(r.string);
    return (multiRef + goodLength) >= minimumScore && !r.refs.includes(r.string);
  }
};

const queriesCatalog = [
  'nobody asked',
  'gay',
  '(tits OR titties)',
  'pussy',
  'cuck',
  'shit',
  'fuck',
  'brainlet',
  'simp'
];

const filtersCatalog = [
  'context:94.*',
  'context:79.*',
  'context:3.*',
  'conext:139.*',
  'context:35.*',
  'context:136.*'
];
const queryFilter = '(-has:links -has:mentions -is:retweet lang:en)';

const removeStreamRules = async () => {
  client.get('tweets/search/stream/rules').then(({data}) => {
    if(!data) return;
    const badrules = data.map(d => {
      return d.id;
    });
    if(badrules) client.post('tweets/search/stream/rules', {delete: {ids: badrules}}).then(r => console.log('removed', r)).catch(console.error);
  }).catch(e=>console.error(e.message));
};

const setStreamRules = async  (kws = chance.pickone(filtersCatalog)) => {
  const rules = [
    {value: `${queryFilter} ${kws}`, tag: `goose_defualt${kws}`},
  ];
  return client.post('tweets/search/stream/rules', {add: rules});
};

module.exports.fetch = async () => {
  const q = `${queryFilter} ${chance.pickone(queriesCatalog)}`;
  const params = {
    query: q,
    max_results: 100
  };
  client.get('tweets/search/recent', params).then(response => {
    if(response.data) {
      response.data.map(tweet => {
        consumeTweet(tweet);
      });
    }
  }).catch(console.error);
};

const consumeTweet = (tweet) => {
  const string = chatterUtil.normalizeSentence(tweet.text);
  const normalizedTweet =  entities.decodeHTML(string);
  recordedTweets.push(normalizedTweet);
  markov.addData([normalizedTweet]);
};

module.exports.stream = async (keyWords) => {
  await setStreamRules(keyWords).then(({meta}) => console.log(meta.summary)).catch((e) => console.error(e.message));
  if(connectionRetries !== 0) {
    console.warn('[Twitter] Stream already in retry.');
  }
  async function listenForever(streamFactory, dataConsumer) {
    setTimeout(() => {
      console.log('[Twitter] Closing...');
      streamFactory().close();
      removeStreamRules();
    }, 300000);
    try {
      for await (const { data } of streamFactory()) {
        dataConsumer(data);
      }
      // The stream has been closed by Twitter. It is usually safe to reconnect.
      console.log('[Twitter] Stream disconnected healthily.');
    } catch (error) {
      // An error occurred so we reconnect to the stream. Note that we should
      // probably have retry logic here to prevent reconnection after a number of
      // closely timed failures (may indicate a problem that is not downstream).
      console.warn(`[Twitter] Stream disconnected with error. Retrying... (${error.message})`);
      if (connectionRetries === 4) {
        console.error(`[Twitter] Tried ${connectionRetries} times. Giving up.`);
        connectionRetries = 0;
        return;
      }
      connectionRetries++;
      setTimeout(() => {
        listenForever(streamFactory, dataConsumer);
      }, 30000);
    }
  }

  listenForever(
    () => client.stream('tweets/search/stream'),
    (data) => consumeTweet(data)
  );
};

module.exports.generateTweet = async (options = twitterGenOptions) => {
  return new Promise((resolve, reject) => {
    try {
      const result = markov.generate(options);
      resolve(result);
    } catch (e) {
      reject(e);
    }
  });
};
