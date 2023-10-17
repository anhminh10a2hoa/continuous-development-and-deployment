const express = require('express');
const fs = require('fs');
const app = express();

const logFilePath = '/app/logs/log.txt'; // This path should match your Docker volume

app.get('/', (req, res) => {
  fs.readFile(logFilePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading log file:', err);
      res.status(500).send('Internal Server Error');
    } else {
      res.send(data);
    }
  });
});

app.listen(8080, () => {
  console.log('HTTP server listening on port 8080');
});
