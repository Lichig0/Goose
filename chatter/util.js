const settings = require('../settings');
// const coreThoughts = require('./coreThoughts');

const urlRegex = new RegExp(/[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)?/gi);
const userIDRegex = new RegExp(/^\s?(<@){1}([0-9]{18})>/i);
const brokenUserIDRegex = new RegExp(/^\s?(<@){0}([0-9]{18})>/i);
// const data = coreThoughts.coreThoughts(ct => markov.addData(Object.values(ct)));
const data = {};
const addMessageToModel = (message, markovModel, splitRegex = undefined) => {
  const { id, guild, content, channel, attachments } = message;
  const config = settings.settings.chatter;
  const preFormat = config.preFormat || false;
  const splitter = splitRegex instanceof RegExp ? splitRegex : new RegExp(config.messageSplitter);

  let resolvedUserNameContent = content.replace(brokenUserIDRegex, '<@$2>');
  if(userIDRegex.test(resolvedUserNameContent)) {
    const guildUser = guild.member(userIDRegex.exec(resolvedUserNameContent)[2]);
    if( guildUser ) {
      const username = guildUser.nickname || guildUser.user.username;
      resolvedUserNameContent = resolvedUserNameContent.replace(userIDRegex, username);
    }
  }
  

  const subMessage = resolvedUserNameContent.match(urlRegex) ? [resolvedUserNameContent] : resolvedUserNameContent.split(splitter);
  const cache = { string: resolvedUserNameContent, id, guild: guild.id, channel: channel.id, attachments: attachments, nsfw: channel.nsfw };

  subMessage.forEach((str, i) => {
    const trimmedString = str.trim();

    if (trimmedString !== '') { //skip empty strings
      cache.string = preFormat ? `${trimmedString.replace(trimmedString[0], trimmedString[0].toUpperCase())}.` : trimmedString; // Experimental
      if (data[`${id}.${i}`] !== undefined) {
        return;
      } else {
        data[`${id}.${i}`] = cache;
        markovModel.addData([cache]);
      }
    } else if (cache.attachments.size > 0 && data[`${id}.${0}`] === undefined) {

      const substituteString = channel.messages.cache.array()[1].content;
      let tCache = data[`${id}.${i}`] = { 
        ...cache,
        trimmedString: substituteString
      };
      markovModel.addData([tCache]);
    }
  });
  return cache;
};


module.exports.addMessageToModel = addMessageToModel;