require("dotenv").config();
const Discord = require("discord.js");
const fs = require("fs");
const sqlite3 = require('sqlite3');
const client = new Discord.Client();

fs.readdir("./events/", (err, files) => {
    files.forEach(file => {
        const eventHandler = require(`./events/${file}`)
        const eventName = file.split(".")[0]
        client.on(eventName, arg => eventHandler(client, arg))
    })
})

let db = new sqlite3.Database('goosedb.sqlite', (err) => {
    if (err) {
        return console.error(err.message);
    }
    console.log('Connected to the SQlite database.');
});

// close the database connection
db.close((err) => {
    if (err) {
        return console.error(err.message);
    }
    console.log('Close the database connection.');
});

client.login(process.env.BOT_TOKEN)