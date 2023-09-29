const fs = require('fs');
const http = require('http');

const service1LogPath = '/logs/service1.log';
const service2Address = 'http://service2:8000';

let counter = 1;

function composeText() {
  const currentTime = new Date().toISOString();
  const text = `${counter} ${currentTime} ${service2Address}`;

  return text;
}

function writeLog(text) {
  fs.appendFileSync(service1LogPath, text + '\n');
}

function sendToService2(text) {
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
    },
  };

  const req = http.request(service2Address, options, (res) => {
    if (res.statusCode !== 200) {
      writeLog(`Error sending to Service 2: ${res.statusCode}`);
    }
  });

  req.on('error', (error) => {
    writeLog(`Error sending to Service 2: ${error.message}`);
  });

  req.write(text);
  req.end();
}

function main() {
  try {
    fs.writeFileSync(service1LogPath, '');

    const interval = setInterval(() => {
      if (counter <= 20) {
        const text = composeText();
        writeLog(text);
        sendToService2(text);
        counter++;
      } else {
        writeLog('STOP');
        sendToService2('STOP');
        fs.closeSync(fs.openSync(service1LogPath, 'w'));
        clearInterval(interval);
      }
    }, 2000);
  } catch (error) {
    console.error(error);
  }
}

main();
