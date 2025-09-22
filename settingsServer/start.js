const { spawn } = require('child_process');

// Start main server
const mainServer = spawn('node', ['server.js'], {
  stdio: 'inherit'
});

// Start proxy server
const proxyServer = spawn('node', ['proxy.js'], {
  stdio: 'inherit'
});

// Handle cleanup
const cleanup = () => {
  mainServer.kill();
  proxyServer.kill();
  process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Handle server exits
mainServer.on('close', (code) => {
  console.log(`Main server exited with code ${code}`);
  cleanup();
});

proxyServer.on('close', (code) => {
  console.log(`Proxy server exited with code ${code}`);
  cleanup();
});