const fs = require('fs');
const { cbrt } = require('mathjs');

exports.eggs = [];

exports.load = (callback) => {
    fs.readFile('./chatter/easterEggs.json', 'utf8', function(err, data){
        if (err) {
            return console.error(err);
        }

        const eggs = exports.eggs = JSON.parse(data);
        callback(exports.eggs);
    })
}