module.exports = message => {
    const { author } = message
    author.createDM().then(dm => dm.send("Pong~"));
}