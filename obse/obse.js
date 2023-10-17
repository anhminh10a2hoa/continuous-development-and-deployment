const fs = require('fs');
const logFilePath = '/app/logs/log.txt'; // This path should match your Docker volume

const writeLog = (timestamp, topic, message) => {
  const logEntry = `${timestamp} Topic ${topic}: ${message}\n`;
  fs.appendFile(logFilePath, logEntry, (err) => {
    if (err) {
      console.error('Error writing to log file:', err);
    }
  });
};

// Function to build and write log entry
const buildAndWriteLogEntry = (topic, message) => {
  const timestamp = new Date().toISOString();
  writeLog(timestamp, topic, message);
};

// Example usage (you should call this function when you receive a message)
buildAndWriteLogEntry('my.o', 'MSG_1');
