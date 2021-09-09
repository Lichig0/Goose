const { coreThoughts } = require('./coreThoughts');
const Chance = require('chance');
const Markov = require('markov-strings').default;
class Brain {
  #guild;
  #corpus;
  #data;
  #processedMessages;
  #chance = new Chance();

  static urlRegex = new RegExp(/[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)?/gi);
  static userIDRegex = new RegExp(/^\s?(<@){1}([0-9]{18})>/i);
  static brokenUserIDRegex = new RegExp(/^\s?(<@){0}([0-9]{18})>/i);

  constructor(guild) {
    this.#guild = guild;
    this.#corpus = new Markov({stateSize: 2});
    this.#data = [];
    this.#processedMessages = new Set();
    this.splitRegex = new RegExp('\n.?!;()"'); //eslint-disable-line

    coreThoughts(ct => this.#corpus.addData(Object.values(ct)));
  }


  static normalizeSentence (sentence = '') {
    let resolvedUserNameContent = sentence.replace(Brain.brokenUserIDRegex, '<@$2>');
    const capitalized = `${resolvedUserNameContent.replace(resolvedUserNameContent[0], resolvedUserNameContent[0].toUpperCase())}`;
    return (capitalized.endsWith('.') || capitalized.endsWith('?') || capitalized.endsWith('!')) ? capitalized : `${capitalized}.`;
  }

  get corpus() {
    return this.#corpus;
  }

  async #fetchMessages(channel, beforeMessage) {
    return beforeMessage.channel?.id === channel.id ? channel.messages.fetch({ limit: 100, before: beforeMessage.id }) : channel.messages.fetch({ limit:100 });
    // return beforeMessage.channel?.id === channel.id ? this.#testFetch(channel, { limit: 100, before: beforeMessage.id }) : this.#testFetch(channel, { limit:100 });
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
      this.#processedMessages.add(this.addMessage(nonEmptyMessage));
    });
  }

  async createSentence(options = {}) {
    return new Promise((resolve, reject) => {
      try {
        const result = this.corpus.generate(options);
        const chatter = result.string.replace(Brain.brokenUserIDRegex, '<@$2>');
        result.string = chatter;
        resolve(result);
      } catch (e) {
        reject(e);
      }
    });
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
      const guildHisotry = Promise.all(tasks);
      readRetry <= 3 ? resolve(guildHisotry) : reject(new Error);
    });
  }
  async scrapeChannelHistory(channel, retries = 0) {
    const fullHistory = [];
    if(retries >= 3) {
      return fullHistory;
    }

    let recentFetch = {};
    let fetched = [];
    do {
      fetched = await this.#fetchMessages(channel, recentFetch);
      if(fetched && fetched.size > 0) {
        fullHistory.push(...fetched.values());
        this.#processMessages(fetched);
        if(recentFetch.id === fetched.last().id) {
          break;
        }
        else {
          recentFetch = fetched.last();
        }
      }
    } while(fetched && fetched.size === 100);
    console.log('[End of channel]', channel.name, fullHistory.length, this.#corpus.data.length, Object.values(this.#data).length);
    return fullHistory;
  }
  addMessage(message, splitter = this.splitRegex) {
    const { id, guild, content, channel, attachments } = message;
    let resolvedUserNameContent = content.replace(Brain.brokenUserIDRegex, '<@$2>');

    if(Brain.userIDRegex.test(resolvedUserNameContent)) {
      const guildUser = guild.members.cache.get(Brain.userIDRegex.exec(resolvedUserNameContent)[2]);
      if( guildUser ) {
        const username = guildUser.nickname || guildUser.user.username;
        resolvedUserNameContent = resolvedUserNameContent.replace(Brain.userIDRegex, username);
      }
    }

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
  }

}
exports.Brain = Brain;
