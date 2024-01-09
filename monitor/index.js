const express = require('express');
const amqp = require('amqplib');
const app = express();
let channel;
const logs = [];


const initializeAmqp = async ({ queueNames }) => {
  try {
    const connection = await amqp.connect('amqp://minhhoang:1234@rabbitmq');
    const channel = await connection.createChannel();
    channel.assertExchange('topic_state', 'direct', { durable: true });

    for (const name of queueNames) {
      await channel.assertQueue(name, { durable: false });
      await channel.bindQueue(name, 'topic_state', name);
    }
    return channel;
  } catch (err) {
    console.log(`Encountered an error during amqp initialization: ${err}`);
  }
};

const consumeLogMessages = (channel) =>
  channel.consume(
    'log',
    (msg) => {
      if (!msg) return;

      const log = msg.content.toString('utf8');
      process.stdout.write(`RECEIVED: ${log}`);
      logs.push(log);

      channel.ack(msg);
    },
    { noAck: false }
  );

const consumeStateMessages = (channel) =>
  channel.consume(
    'state-monitor',
    async (msg) => {
      if (!msg) return;
      channel.ack(msg);

      const state = msg.content.toString('utf8');
      if (state !== 'INIT' && state !== 'PAUSED' && state !== 'RUNNING' && state !== 'SHUTDOWN') return;
      if (state === 'SHUTDOWN') await shutDownServer();
    },
    { noAck: false }
  );

app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.send(logs.join(''));
});

app.post('/reset', (req, res) => {
  logs.splice(0, logs.length);
  res.status(200).send();
});

const server = app.listen(8002, async () => {
  console.log(`HTTP server running on port 8002`);

  channel = await initializeAmqp({
    queueNames: ['log', 'state-monitor'],
  });
  if (!channel) return;

  consumeLogMessages(channel);
  consumeStateMessages(channel);
  console.log(
    `Consuming log, state-monitor messages 🥕`
  );
});

const shutDownServer = async () => {
  console.log('Shutting down');
  await channel?.close();
  server.close();
  process.exit(0);
};

process.on('SIGTERM', shutDownServer);
process.on('SIGINT', shutDownServer);
