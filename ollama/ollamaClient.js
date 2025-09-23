const settings = require('../settings');


class OllamaClient {
  constructor(baseUrl = 'http://127.0.0.1:11434') {
    this.baseUrl = baseUrl;
  }

  async generateResponse(prompt, options = {}) {
    const config = settings.settings.ollama;
    options = {
      ...config,
      ...options
    };
    const model = options.model || 'gemma3:1b';
    const temperature = options.temperature || 0.7;
    
    try {
      const body = JSON.stringify({
        model,
        messages: options.messages,
        prompt: `${options.promptPrefix}\n\n${prompt}`,
        think: false,
        stream: false,
        keep_alive: options.keepAlive ?? '1m',
        system: options.systemPrompt ?? '',
        temperature,
        top_k: options.topK ?? 40,
        top_p: options.topP ?? 0.9,
        max_tokens: options.maxTokens ?? config.maxTokens,
      });
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('Ollama generation error:', error);
      throw error;
    }
  }

  async isModelReady(model = 'gemma3:1b') {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        return false;
      }
      const data = await response.json();
      return data.models?.some(m => m.name === model) || false;
    } catch (error) {
      console.error('Error checking Ollama model:', error);
      return false;
    }
  }
}

module.exports = new OllamaClient();