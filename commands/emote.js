const Chance = require('chance');
const chance = new Chance();
module.exports.help = () => {'Emote.'};

module.exports.run = (message, epeen) => {
    const toSay = chance.bool({likelihood: 90});
    const { client, channel } = message;
    if(toSay) {
        channel.send(client.emojis.cache.random().toString()).catch(console.error);
    } else {
        message.react(client.emojis.cache.random().id).catch(console.error);
    }
};