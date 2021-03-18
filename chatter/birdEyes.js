const Twitter = require('twitter-v2');
const Markov = require('markov-strings').default;
const client = new Twitter({
  bearer_token: process.env.TWITTER_BEARER_TOKEN
});
const recordedTweets = [];
let markov = new Markov({ stateSize: 2 });

module.exports.fetch = async () => {
  const params = {
    query: '(-has:links -has:mentions -is:retweet) (nobody asked OR dick OR cuck OR shit OR fuck OR brainlet OR xbox OR playstation OR nintendo OR tw)',
    max_results: 100
  };
  client.get('tweets/search/recent', params).then(response => {
    // console.log('twitter:', response.data, response.meta);
    if(response.data) {
      const tweets = response.data.map(tweet => tweet.text);
      // console.log(tweets);
      markov.addData(tweets);
      // module.exports.generateTweet({maxTries: 50, filter: (result) => result.refs.length >= 2}).then(newTweet => {
      //   // console.log('TWEET', newTweet);
      // });
    }
  });
};

module.exports.read = async () => {
  console.log(client);
  const rules = {
    add: [
      // { value: 'playstation -#PS4live lang:en -is:retweet -has:mentions'},
      // { value: 'from:wario64'},
      // { value: 'Nintendo nintendo lang:en -is:retweet -has:mentions'},
      // { value: '(xbox OR playstation OR nintendo OR game OR vidya)  lang:en -is:retweet -has:mentions'},
      // { value: '#BreakingNews lang:en'}
      { value: 'entity:Journalist lang:en'}
    ]
  };
  client.get('tweets/search/stream/rules').then(({data}) => {
    let params = {};
    if(data) {
      const ruleIds = data.map(({id}) => {
        return id;
      });
      params.delete = {ids: ruleIds };
    } else {
      params = rules;
    }
    client.post('tweets/search/stream/rules', params).then((result) => {
      console.log(result.meta);
      if(params.delete) {
        client.post('tweets/search/stream/rules', rules).then(response => {
          console.log(response.meta);
        });
      }
    });
  });
  const stream = client.stream('tweets/search/stream');
  setTimeout(()=> {
    stream.close();
    console.log(`Number of tweets read: ${recordedTweets.length}`);
    // setTimeout(module.exports.read, 15000);
    module.exports.generateTweet({
      maxTries: 40,
      filter: (r) => {
        return r.refs.length >= 2;
      }
    }).then(r=> console.log(`SENTENCE ${r.string}`));
  }, 60000);
  try {
    for await (const {data} of stream) {
      if(recordedTweets.length % 10 === 0) console.log(data.text);
      recordedTweets.push(data.text);
      markov.addData([{string:data.text}]);
    }
  } catch (error) {
    console.log(error);
    setTimeout(module.exports.read, 30000);
  }
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