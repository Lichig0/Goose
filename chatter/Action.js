class Action {
  #name;
  #weight;
  #task = () => new Promise((resolve, reject) => {
    reject('Task is not implemented.');
  });
  
  constructor(name, task, weight = 0) {
    this.#name = name;
    this.weight = weight;
    this.task = task;
  }

  act(options) {
    console.debug(`<${this.#name}>`);
    return this.#task(options);
  }

  set task(actionFunction) {
    this.#task = (options) => new Promise((resolve, reject) => {
      try {
        return resolve(actionFunction(options));
      } catch (error) {
        return reject(error);
      }
    });
  }

  get name() {
    return this.#name;
  }
  get weight() {
    return this.#weight;
  }
  set weight(newWeight) {
    this.#weight = newWeight;
  }
 
}

exports.default = Action;
