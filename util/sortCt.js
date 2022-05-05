// By sorting the ct.json it is easer to see similar starts to strings to make it easer to make multiple variations of a """core thought""" to hopefully make more interesting corpus' from them.

const fs = require('fs');

fs.readFile('chatter/ct.json', 'utf8', (err, data) => {
  if (err) {
    return console.log(err);
  }
  const coreThoughts = JSON.parse(data);
  const sortedThoughts = coreThoughts.sort();

  fs.writeFile('chatter/ct.json', JSON.stringify(sortedThoughts, null, 2), (err) => {
    if(err) {
      console.error(err);
    }
  });
});
