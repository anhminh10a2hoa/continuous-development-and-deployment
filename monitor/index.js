const express = require('express');
const amqp = require('amqplib');
const app = express();
let amqpChannel;
const logs = [];

/**
 * Initializes the AMQP connection and sets up queues and exchanges.
 * @param {Object} options - The configuration options for AMQP initialization.
 * @param {string[]} options.queueNames - Array of queue names to be initialized.
 * @returns {Promise<Channel>} - The AMQP channel.
 */
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
    console.error(`Error during AMQP initialization: ${err}`);
  }
};

/**
 * Consumes log messages from the 'log' queue.
 * @param {Channel} channel - The AMQP channel.
 */
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

/**
 * Consumes state messages from the 'state-monitor' queue.
 * @param {Channel} channel - The AMQP channel.
 */
const consumeStateMessages = (channel) =>
  channel.consume(
    'state-monitor',
    async (msg) => {
      if (!msg) return;
      channel.ack(msg);

      const state = msg.content.toString('utf8');
      // Validate the received state values
      if (state !== 'INIT' && state !== 'PAUSED' && state !== 'RUNNING' && state !== 'SHUTDOWN') return;
      // Handle shutdown state
      if (state === 'SHUTDOWN') await shutDownServer();
    },
    { noAck: false }
  );

/**
 * Express route to get aggregated logs.
 */
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.send(logs.join(''));
});

/**
 * Express route to reset logs.
 */
app.post('/reset', (req, res) => {
  logs.splice(0, logs.length);
  res.status(200).send();
});

/**
 * Starts the HTTP server and initializes AMQP channels and message consumers.
 */
const startServer = async () => {
  console.log(`Monitor running on port 8002`);

  amqpChannel = await initializeAmqp({
    queueNames: ['log', 'state-monitor'],
  });
  if (!amqpChannel) return;

  consumeLogMessages(amqpChannel);
  consumeStateMessages(amqpChannel);
  console.log(`Consuming log`);
};

/**
 * Handles server shutdown gracefully.
 */
const shutDownServer = async () => {
  console.log('Shutting down monitor...');
  await amqpChannel?.close();
  server.close();
  process.exit(0);
};

// Handle graceful shutdown on SIGTERM and SIGINT signals
process.on('SIGTERM', shutDownServer);
process.on('SIGINT', shutDownServer);

// Start the server
const server = app.listen(8002, startServer);
