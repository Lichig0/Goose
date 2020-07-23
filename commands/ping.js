module.exports = message => {
    const { author, channel } = message
    channel.send("Pong~");
    // author.createDM().then(dm => dm.send("Pong~"));
}