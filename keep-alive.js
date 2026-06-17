const { spawn } = require('child_process');
const fs = require('fs');

function startServer() {
  const logFd = fs.openSync('/home/z/my-project/dev.log', 'a');
  const child = spawn('node', ['--max-old-space-size=512', 'node_modules/.bin/next', 'start', '-p', '3000'], {
    cwd: '/home/z/my-project',
    stdio: ['ignore', logFd, logFd],
    detached: true
  });
  
  child.unref();
  fs.closeSync(logFd);
  
  child.on('exit', (code, signal) => {
    const msg = `[Keep-Alive] Server exited with code=${code} signal=${signal}, restarting in 5s...\n`;
    fs.appendFileSync('/home/z/my-project/dev.log', msg);
    setTimeout(startServer, 5000);
  });
  
  console.log(`[Keep-Alive] Server started with PID=${child.pid}`);
}

startServer();

// Keep the script alive
setInterval(() => {}, 60000);
