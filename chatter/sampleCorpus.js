const fs = require('fs');
const Markov = require('word-chains/Markov');
// const Tokenizer = require('word-chains/Tokenizer');

const SENTENCE = /(?<sentence>([^.!?]|\d\.\d*)*([.?!](\s+|$)|$))/gm;
const markov = new Markov.MarkovChain(2);


const sampleGenOptions = {
  retries: 10,
  filter: (r) => {
    const length = markov.tokenizer.tokenize(r.string).length;
    return 3 < length && length <= 50;
  }
};

const getSampleData = async () => {
  const readSampleData = () => {
    return new Promise((resolve, reject) => {
      fs.readdir('./Sample_Data/', 'utf-8', (error, fileList) => {
        if (error) {
          return reject(error);
        }
        return resolve(fileList);
      });
    });
  };
  const readFile = (file) => new Promise((resolve, reject) => {
    fs.readFile(`./Sample_Data/${file}`, 'utf8', function (err, data) {
      if (err) {
        return reject(err);
      }
      return resolve(data);
    });
  });

  return new Promise((resolve, reject) => {
    readSampleData().then(files => {
      const filePromises = files.map(file => readFile(file));
      Promise.all(filePromises).then(resolve).catch(reject);
    }, reject);
  });
};


module.exports.init = () => {
  getSampleData().then(bookArray => {

    bookArray.forEach(book => {
      const blocks = book.split('\n\n').filter(s=>s.trim() !== '');
      const sentences = blocks.flatMap((block) => {
        return block.replaceAll('\n', ' ').trim().match(SENTENCE).filter(s => s !== null);
      });
      sentences.forEach((sentence) => {
        markov.addString(sentence);
      });
    });
  });
};

module.exports.generateSentence = async (options = sampleGenOptions) => {
  const foundInputs = markov.findInputs(options.input).reverse().slice(0,10);
  const inputOptions = foundInputs
    ? foundInputs
    : [options.input];

  // Divide inputs and try parallelizing
  const parallelInputs = [];
  for(let i = 0; i < inputOptions.length; i+=2) {
    parallelInputs.push([
      inputOptions[i],
      inputOptions[i+1]
    ]);
  } 
  console.log('[Book Chain]::Found states',`"${inputOptions}"`);
  for(const inputArray of parallelInputs) {
    console.log('[Book Chain]::Checking state',`"${inputArray}" of "${parallelInputs}"`);
    const result = await Promise.any([
      markov.generateSentence({options, input: inputArray[0]}),
      inputArray[1] ? markov.generateSentence({...options, input: inputArray[1]}) : Promise.reject('Empty second option'),
    ]).catch((e) => console.warn('[Book Chain]::No result', inputArray[0], inputArray[1], 'could not complete.', e));
    if(result) {
      return new Promise((resolve) => {
        resolve({
          string: result.text,
          text: result.text,
          refs: Object.values(result.refs),
        });
      });
    }
    return Promise.reject('[Book Brain]::Failed to create sentence ',`${options.input}`); 
  }
};

module.exports.sampleGenOptions = sampleGenOptions;