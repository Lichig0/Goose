const message = require("../events/message");
const curse = require("../commands/curse");

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
        `Don't be a Jerry.`,
        `Don't break an arm jerking yourself off.`,
        `Glip glops? It's like the n-word and the c-word had a baby and it was raised by all the bad words for Jews.`,
        `So your origin is what? You fell in a vat of redundancy?`,
        `${getRandomUsers(message)} would suck a dick just to cut in line to suck a bigger dick.`,
        `Right now the only thing I want in this world besides for ${getRandomUsers(message)} to die of some heretofore unknown form of eyehole cancer is to leave this godforsaken sever!`,
        `${getRandomUsers(message)}’s just as full of crap as ${getRandomUsers(message)} is chromosomes.`,
        `I can envision millions of Americans rising up as one and demanding legislation that would require ${getRandomUsers(message)} legs to be amputated, burned, and buried next to Hitler.`,
        `${getRandomUsers(message)} won’t truly appreciate the awkwardness of this moment until they’re fondly reminiscing as a 35-year-old homosexual.`,
        `Hahaha. Fuck you. ${curse(message)}`,
        
    ]
    return def ? insults[def] : insults[Math.floor(Math.random() * insults.length)];
}

const getRandomUsers = function(message,n = 1) {
    const members = message.channel.members.array();
    return members[Math.floor(Math.random() * members.length)];
}
