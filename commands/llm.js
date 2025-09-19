const { SlashCommandBuilder } = require('discord.js');
const ollamaClient = require('../chatter/ollamaClient');
const path = require('path');
const COMMAND_NAME = path.basename(__filename, '.js');

const audit = {
  timestamp: Date.now()
};
module.exports.audit = () => audit;

exports.getCommandData = () => {
  return new SlashCommandBuilder()
    .setName(COMMAND_NAME)
    .setDescription('Ask a question and get an AI response')
    .addStringOption(option => {
      option.setName('prompt')
        .setDescription('Your question or prompt')
        .setRequired(true);
      return option;
    });
};

exports.execute = async (client, interaction) => {
  await interaction.deferReply();
  try {
    // Get the last 20 messages from the channel
    const messages = await interaction.channel.messages.fetch({ limit: 10 });
    // Format message history into context
    const messageHistory = messages
      .reverse()
      .map(msg => `${msg.author.username}: ${msg.content}`)
      .join('\n');

    const prompt = interaction.options.getString('prompt');
    const isReady = await ollamaClient.isModelReady();
    if (!isReady) {
      console.warn('[Ollama] Model not ready');
      return { string: 'Sorry, I need a moment to collect my thoughts...' };
    }
    
    // Set system prompt with chat context
    const systemPrompt =
      `You are in a Discord chat, you'll talk in a similar manor to those in the chat so you can fit in. Here is the recent chat history for context:\n${messageHistory}\n\nPlease respond to the user's next message. Next message: ${prompt}`
    ;

    // Generate response
    const response = await ollamaClient.generateResponse(systemPrompt, {
      temperature: 0.9
    });

    if (!response) {
      await interaction.editReply('Sorry, I got an empty response from the model.');
      return;
    }

    // Format the response to fit in Discord's message length limit
    const chunks = response.match(/.{1,1900}/g) || [];
    
    // Send first chunk as edit to deferred reply
    await interaction.editReply(chunks[0]);
    
    // Send any remaining chunks as follow-up messages
    for (let i = 1; i < chunks.length; i++) {
      await interaction.followUp(chunks[i]);
    }

  } catch (error) {
    console.error('Error in llm command:', error);
    await interaction.editReply('Sorry, there was an error processing your request.');
  }
};

module.exports.dev = false;
