const { coreThoughts } = require('./coreThoughts');
const Chance = require('chance');
const settings = require('../settings');
const Markov = require('markov-strings').default;
const chatterUtil = require('./util');

class Brain {
  #guild;
  #client;
  #corpus;
  #data;
  #generationOptions;
  #singleWords = {};
  #processedMessages;
  #chance = new Chance();

  static urlRegex = new RegExp(/[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)?/gi);
  static userIDRegex = new RegExp(/^\s?(<@){1}([0-9]{18})>/i);
  static brokenUserIDRegex = new RegExp(/^\s?(<@){0}([0-9]{18})>/i);

  constructor(guild) {
    this.#guild = guild;
    this.#client = guild.client;
    this.#corpus = new Markov({stateSize: 2});
    this.#data = [];
    this.#processedMessages = new Set();
    this.splitRegex = new RegExp(/[\n.?!;()"]/);
    coreThoughts(ct => this.#corpus.addData(Object.values(ct)));
  }

  static generateFilter(content, channel) {
    const { channelInfluence = 2, minimumScore = 2 } = settings.settings.chatter;
    const refsScore = (refs) => { // this may be too agressive.
      let score = 0;
      refs.forEach(ref => {
        score += ref.channel === channel.id ? channelInfluence : -channelInfluence;
      });
      return score;
    };
    const filter = (result) => {
      const metScoreConstraints = chatterUtil.wordScore(result.string, content) + refsScore(result.refs) >= minimumScore;
      console.debug('Channel Ref score:', refsScore(result.refs));
      // const metScoreConstraints = chatterUtil.wordScore(result.string, content) >= minimumScore;
      const metUniqueConstraint = result.refs.length >= 2 && !result.refs.includes(result.string);
      const metPairsConstraints = chatterUtil.hasPairs(result.string);
      const hasNSFWRef = result.refs.reduce(chatterUtil.nsfwCheck , false);
      const metNSFWConstraints = hasNSFWRef.nsfw ? channel.nsfw : true;

      return metScoreConstraints && metPairsConstraints && metNSFWConstraints && metUniqueConstraint;
    };
    return filter;
  }

  static normalizeSentence (sentence = '') {
    if (sentence.match(Brain.urlRegex)) return sentence;
    let resolvedUserNameContent = sentence.replace(Brain.brokenUserIDRegex, '<@$2>');
    const capitalized = `${resolvedUserNameContent.replace(resolvedUserNameContent[0], resolvedUserNameContent[0].toUpperCase())}`;
    return (capitalized.endsWith('.') || capitalized.endsWith('?') || capitalized.endsWith('!')) ? capitalized : `${capitalized}.`;
  }

  get corpus() {
    return this.#corpus;
  }

  async #fetchMessages(channel, beforeMessage) {
    return beforeMessage.channel?.id === channel.id ? channel.messages.fetch({ limit: 100, before: beforeMessage.id }, {cache: false, force: true}) : channel.messages.fetch({ limit:100 }, {cache: false, force: true});
    // return beforeMessage.channel?.id === channel.id ? this.#testFetch(channel, { limit: 100, before: beforeMessage.id }) : this.#testFetch(channel, { limit:100 });
  }

  clearGuildCache() {
    console.log('[Brain] Clearing data cache');
    this.#data = [];
  }

  async #testFetch(channel, {before = -1}) {
    return new Promise((resolve, reject) => {
      const fakeMessages = [];
      const id = before+1;
      for(let i=id; i<id+100;i++) {
        if(i>=15030) break;
        fakeMessages.push({id:i, content:`this is a test ${i}`, channel});
      }
      if(fakeMessages[fakeMessages.length-1]?.id < 0) {
        reject(new Error('Bad ID'));
      }
      setTimeout(resolve(fakeMessages), 10000);
    });
  }

  async #processMessages(channelMessages = []) {
    channelMessages.forEach(nonEmptyMessage => {
      if(nonEmptyMessage.author.bot) return;
      this.#processedMessages.add(this.addMessage(nonEmptyMessage));
    });
  }

  #addSingleWord(word) {
    if(word === '') return;
    // const normalized = Brain.normalizeSentence(word);
    if(this.#singleWords[word]) {
      this.#singleWords[word].count++;
    } else {
      this.#singleWords[word] = { count: 1, word:word};
    }

  }

  async createSentence(options = {}) {
    return new Promise((resolve, reject) => {
      try {
        const result = this.corpus.generate(options);
        const chatter = result.string.replace(Brain.brokenUserIDRegex, '<@$2>');
        result.string = chatter;
        resolve(result);
      } catch (e) {
        reject(`Bad Sentence ${e}`);
      }
    });
  }

  getRandomWord() {
    return this.#chance.pickone(Object.values(this.#singleWords)).word;
  }

  generateWordSeakingRandom = (content) => {
    const pRandomStartSelect = () => {
      this.#corpus.startWords = this.#chance.shuffle(this.#corpus.startWords);
      const word = this.#corpus.startWords.findIndex(startWord => {
        const words = startWord.words.toLowerCase();
        const contentWord = this.#chance.pickone(content.split(' ')).toLowerCase();
        return words !== '' && words.includes(contentWord);
      });

      if(word > 0){
        const notSoRandom = (word/this.#corpus.startWords.length);
        return notSoRandom;
      }
      const random = Math.random();
      return random;
    };
    return pRandomStartSelect;
  };

  async scrapeGuildHistory(textChannels, readRetry = 0) {
    return new Promise( (resolve, reject) => {
      const {client} = this.#guild;
      const guild = this.#guild;

      client.user.setStatus('dnd');
      client.user.setActivity('📖🔍🤔', { type: 'WATCHING' });

      console.log(`[Scraping History]: ${guild.name} | Channels: ${textChannels.map(channel=>channel.name)}`);

      const tasks = textChannels.map(chan => this.scrapeChannelHistory(chan).catch((e) => {
        console.error(e);
        readRetry++;
        this.scrapeChannelHistory(chan, readRetry);
      }));
      const guildHistory = Promise.all(tasks);
      readRetry <= 3 ? resolve(guildHistory) : reject('Failed to read history');
    });
  }
  async scrapeChannelHistory(channel, retries = 0) {
    const { hisotryCoverage = 100 } = settings.settings.chatter;
    const fullHistory = [];
    if(retries >= 3) {
      return fullHistory;
    }

    let recentFetch = {};
    let fetched = [];
    do {
      fetched = await this.#fetchMessages(channel, recentFetch).catch(console.error);
      const split = fetched.partition(() => this.#chance.bool({likelihood: hisotryCoverage})); // Reduce total size to save on memory for now
      if(split[0] && split[0].size > 0) {
        fullHistory.push(...split[0].values());
        this.#processMessages(split[0]);
        if(recentFetch.id === split[0].last().id) {
          break;
        }
        else {
          recentFetch = split[0].last();
        }
      }
    } while(fetched && fetched.size === 100 && this.#corpus.data.length <= 225000);
    console.log('[Channel End]', channel.name, fullHistory.length, this.#corpus.data.length, Object.values(this.#data).length, Object.keys(this.#singleWords).length, (process.memoryUsage().heapTotal / 1024));
    return fullHistory;
  }
  addMessage(message, splitter = this.splitRegex) {
    try {
      const { id, guild, channel, attachments, author } = message;
      const optedOutIds = this.#guild.client.optedOutUsers.map(({userId}) => userId);
      const content = optedOutIds.includes(author?.id) ? this.#chance.sentence() : message.content;
      let resolvedUserNameContent = content.replace(Brain.brokenUserIDRegex, '<@$2>');

      if(Brain.userIDRegex.test(resolvedUserNameContent)) {
        const guildUser = guild.members.cache.get(Brain.userIDRegex.exec(resolvedUserNameContent)[2]);
        if( guildUser ) {
          const username = guildUser.nickname || guildUser.user.username;
          resolvedUserNameContent = resolvedUserNameContent.replace(Brain.userIDRegex, username);
        }
      }
      const wordCount = resolvedUserNameContent.split(' ').length;
      if(wordCount > 0 && wordCount <= 2) return this.#addSingleWord(resolvedUserNameContent);
      const subMessage = resolvedUserNameContent.match(Brain.urlRegex) ? [resolvedUserNameContent] : resolvedUserNameContent.split(splitter);
      const cache = { string: resolvedUserNameContent, id, guild: guild.id, channel: channel.id, attachments: attachments, nsfw: channel.nsfw };
      subMessage.forEach((str, i) => {
        const trimmedString = str.trim();

        if (trimmedString !== '') { //skip empty strings
          cache.string = Brain.normalizeSentence(trimmedString);
          if (this.#data[`${id}.${i}`] !== undefined) {
            return;
          } else {
            this.#data[`${id}.${i}`] = cache;
            this.#corpus.addData([cache]);
          }
        } else if (cache.attachments.size > 0 && this.#data[`${id}.${0}`] === undefined && channel.messages.cache.last(2)[1]) {

          const substituteString = channel.messages.cache.last(2)[1].content;
          let tCache = this.#data[`${id}.${i}`] = {
            ...cache,
            trimmedString: substituteString
          };
          this.#corpus.addData([tCache]);
        }
      });
      return cache;
    } catch (e) {
      console.error('Error adding message', e);
    }
  }

}
exports.Brain = Brain;
