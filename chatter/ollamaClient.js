class OllamaClient {
  constructor(baseUrl = 'http://127.0.0.1:11434') {
    this.baseUrl = baseUrl;
  }

  async generateResponse(prompt, options = {}) {
    const model = options.model || 'gemma3:1b';
    const temperature = options.temperature || 0.7;
    
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt,
          options: {
            temperature,
            top_k: options.top_k || 40,
            top_p: options.top_p || 0.9,
            max_tokens: options.max_tokens || 512,
            keep_alive: options.keep_alive || '5m',
          },
          stream: false
        })
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