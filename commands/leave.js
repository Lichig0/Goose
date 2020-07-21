module.exports = message => {
    message.channel.send("This is all your fault.");
    return message.guild.leave();
}