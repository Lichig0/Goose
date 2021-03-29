const Twitter = require('twitter-v2');
const Markov = require('markov-strings').default;
const Chance = require('chance');
const chance = new Chance();
const client = new Twitter({
  bearer_token: process.env.TWITTER_BEARER_TOKEN
});
const recordedTweets = [];
let markov = new Markov({ stateSize: 2 });

const queriesCatalog = [
  'nobody asked',
  'gay',
  '(tits OR titties)',
  'pussy',
  'dick',
  'cuck',
  'shit',
  'fuck',
  'brainlet',
  'tw',
  'nintendo',
  'sony',
  'playstation',
  'xbox',
  'POTUS',
  'Trump',
  'Biden'
];
const queryFilter = '(-has:links -has:mentions -is:retweet)';

module.exports.fetch = async () => {
  const q = `${queryFilter} ${chance.pickone(queriesCatalog)}`;
  const params = {
    // query: '(-has:links -has:mentions -is:retweet) (nobody asked OR pussy OR dick OR cuck OR shit OR fuck OR brainlet OR xbox OR playstation OR nintendo OR tw)',
    query: q,
    max_results: 100
  };
  client.get('tweets/search/recent', params).then(response => {
    if(response.data) {
      const tweets = response.data.map(tweet => tweet.text.replace('&amp', '&'));
      recordedTweets.push(...tweets);
      markov.addData(tweets);
    }
  });
};

module.exports.generateTweet = async (options = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const result = markov.generate(options);
      resolve(result);
    } catch (e) {
      reject(e);
    }
  });
};