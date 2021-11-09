// https://discordjs.guide/sharding/#when-to-shard
console.log('[Index] Starting....');
require('dotenv').config();
const { ShardingManager } = require('discord.js');
const token = process.env.BOT_TOKEN;
const manager = new ShardingManager('./bot.js', { token });

manager.on('shardCreate', shard => console.log(`Launched shard ${shard.id}`));
manager.spawn().then(shardCollection => {
  console.log('[Sharding Manager]', shardCollection.keys());
}).catch(console.error);
