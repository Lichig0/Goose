const message = require("../events/message");

module.exports = message => {
    getRandomUsers(message);
    return message.channel.send(getInsult(message))
}


const getInsult = function(message, def) {
    const insults = [
        `If I cared about what you do on the weekend, I'd stick a shotgun in my mouth and pull the trigger with my toes.`,
        `Swear to God, ${getRandomUsers(message)} makes me want to pump nerve gas through the vents.`,
        `If I did want a grandchild, I’d just scrape all ${getRandomUsers(message)}'s previous mishaps into a big pile and knit a onesie for it.`,
        `So don’t speak to me. Ever. And while you’re not ever speaking to me; jump up ${getRandomUsers(message)}'s ass and die.`,
        `Do I Get Bonus Points If I Act Like I Care?`,
        `What's The Opposite Of 'Thank You'? I'm Pretty Sure It Ends In 'You.'`,
    ]
    return def ? insults[def] : insults[Math.floor(Math.random() * insults.length)];
}

const getRandomUsers = function(message,n = 1) {
    const members = message.channel.members.array();
    return members[Math.floor(Math.random() * members.length)];
}