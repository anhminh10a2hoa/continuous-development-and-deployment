const fs = require('fs');
const express = require('express');
const { DateTime } = require('luxon');

// Message Queue Simulation
const messageQueue = {
  'my.o': ['MSG_1', 'MSG_2', 'MSG_3'],
};

// HTTP Server
const app = express();
const logFilePath = 'log.txt';

app.get('/', (req, res) => {
  fs.readFile(logFilePath, 'utf8', (err, data) => {
    if (err) {
      res.status(500).send('Error reading log file');
    } else {
      res.send(data);
    }
  });
});

// OBSE
function logMessage(topic, message) {
  const timestamp = DateTime.utc().toISO();
  const logEntry = `${timestamp} Topic ${topic}: ${message}\n`;

  fs.appendFile(logFilePath, logEntry, (err) => {
    if (err) {
      console.error('Error writing to log file:', err);
    }
  });
}

// IMED
function processMessage(message) {
  setTimeout(() => {
    const response = `Got ${message}`;
    logMessage('my.i', response);
  }, 1000);
}

// ORIG
function publishMessagesToTopic(topic, messages) {
  messages.forEach((message, index) => {
    setTimeout(() => {
      logMessage(topic, message);
      processMessage(message);
    }, index * 3000); // Delay each message by 3 seconds
  });
}

// Simulate ORIG publishing messages
publishMessagesToTopic('my.o', messageQueue['my.o']);

// Clear log file on startup
fs.writeFile(logFilePath, '', (err) => {
  if (err) {
    console.error('Error clearing log file:', err);
  }
});

const server = app.listen(8080, () => {
  console.log('HTTP server is running on port 8080');
});

// Graceful shutdown
process.on('SIGINT', () => {
  server.close(() => {
    console.log('HTTP server is shutting down');
    process.exit(0);
  });
});
