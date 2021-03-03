// const Discord = require('discord.js');

function BaseCommand () {
  this._auditHistory = {};

  this.audit = {};
}

BaseCommand.prototype.init = (client) => {
  console.log(`Base Init on: ${client}`);
};

BaseCommand.prototype.help = () => {
  return 'For emergencies, please dial 911.';
};

BaseCommand.prototype.audit = (auditID) => {
  if (this._auditHistory[auditID] !== undefined) {
    return this._auditHistory[auditID];
  }
  return this.audit;
};

BaseCommand.prototype.run = (message, epeen, client) => {
  console.warn(message, epeen, client);
};

BaseCommand.prototype.sendMessage = (channel, text, options) => {
  const a = this.audit;
  channel.send(text, options).then(sentMessage => {
    a.timestamp = Date.now();
    this._auditHistory[sentMessage.id] = a;
  });
};

module.exports = BaseCommand;