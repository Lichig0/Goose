const express = require('express');
const fs = require('fs').promises;
const path = require('path');

async function startServer() {
  const app = express();

  // Middleware to parse JSON bodies
  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));

  // Get settings
  app.get('/api/settings', async (req, res) => {
    try {
      const settings = await fs.readFile(path.join(__dirname, '../settings.json'), 'utf8');
      res.json(JSON.parse(settings));
    } catch (error) {
      res.status(500).json({ error: 'Failed to read settings' });
    }
  });

  // Update settings
  app.post('/api/settings', async (req, res) => {
    try {
      const newSettings = req.body;
      // Pretty print JSON with 2 spaces
      await fs.writeFile(
        path.join(__dirname, '../settings.json'),
        JSON.stringify(newSettings, null, 2),
        'utf8'
      );
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update settings' });
    }
  });

  // Get local IP
  function getLocalIP() {
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        // Skip internal and non-IPv4 addresses
        if (!net.internal && net.family === 'IPv4') {
          return net.address;
        }
      }
    }
    return 'localhost';
  }

  const port = 46673;
  const { startProxyServer } = require('./proxy');

  const server = await new Promise((resolve, reject) => {
    const server = app.listen(port, '0.0.0.0', () => {
      const localIP = getLocalIP();
      console.log('Settings server running at:');
      console.log(`  http://${localIP}:${port}`);
      console.log(`  http://localhost:${port}`);
      resolve(server);
    }).on('error', reject);
  });

  try {
    await startProxyServer();
  } catch (error) {
    console.error('Failed to start proxy server:', error);
  }

  return server;
}

module.exports = { startServer };