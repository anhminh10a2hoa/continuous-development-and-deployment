const fs = require('fs');
const http = require('http');

const service2LogPath = '/logs/service2.log';
const port = 8000;

const server = http.createServer((req, res) => {
  let body = '';

  req.on('data', (data) => {
    body += data;
  });

  req.on('end', () => {
    if (body === 'STOP') {
      fs.closeSync(fs.openSync(service2LogPath, 'w')); 
      process.exit(0);
    } else {
      const currentTime = new Date().toISOString();
      const text = `${body} ${req.connection.remoteAddress}:${req.connection.remotePort} ${currentTime}`;
      fs.appendFileSync(service2LogPath, text + '\n');
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('OK');
    }
  });
});

server.listen(port, () => {
  console.log(`Service 2 listening on port ${port}`);
});
