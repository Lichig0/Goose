const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const app = express();

// Check if we can bind to port 80
const testPort = () => {
  return new Promise((resolve) => {
    const testServer = require('http').createServer();
    testServer.once('error', () => {
      resolve(false);
    });
    testServer.once('listening', () => {
      testServer.close();
      resolve(true);
    });
    testServer.listen(80);
  });
};

async function startProxyServer() {
  const canUsePort80 = await testPort();
  
  if (!canUsePort80) {
    console.log('Port 80 is not available. Skipping proxy server.');
    return null;
  }

  // Set up proxy middleware
  const proxy = createProxyMiddleware({
    router: (req) => {
      // Use the same hostname as the incoming request
      return `http://${req.hostname}:46673`;
    },
    changeOrigin: true,
    ws: true, // in case you need websocket support
    logger: console
  });

  // Use the proxy for all routes
  app.use('/', proxy);

  return new Promise((resolve, reject) => {
    const server = app.listen(80, '0.0.0.0', () => {
      console.log('Proxy server running on port 80');
      resolve(server);
    }).on('error', (err) => {
      console.error('Failed to start proxy server:', err);
      reject(err);
    });
  });
}

module.exports = { startProxyServer };