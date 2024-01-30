const express = require('express');
const axios = require('axios');
const amqp = require('amqplib');
const app = express();
let amqpChannel;
let currentState = 'INIT';
const runLog = [];

app.use(express.text());

/**
 * Express route to get messages log from the monitor.
 */
app.get('/messages', async (req, res) => {
  try {
    const messagesLogResponse = await axios.get('http://monitor:8002');
    const messagesLog = messagesLogResponse.data;
    res.setHeader('Content-Type', 'text/plain').status(200).send(messagesLog);
  } catch (err) {
    res.status(404).send();
  }
});

/**
 * Express route to get the run log.
 */
app.get('/run-log', async (req, res) => {
  res.setHeader('Content-Type', 'text/plain').status(200).send(runLog.join(''));
});

/**
 * Express route to get the current state.
 */
app.get('/state', async (req, res) => {
  res.setHeader('Content-Type', 'text/plain').status(200).send(currentState);
});

/**
 * Express route to update the state.
 */
app.put('/state', async (req, res) => {
  const newState = req.body;
  if (!isValidState(newState)) {
    res.sendStatus(400).send();
    return;
  }
  if (currentState === newState) {
    res.setHeader('Content-Type', 'text/plain').status(200).send(currentState);
    return;
  }
  await updateState(newState);
  res.setHeader('Content-Type', 'text/plain').status(200).send(currentState);
});

/**
 * Appends a log entry to the run log.
 * @param {string} newState - The new state.
 */
const appendToLog = (newState) =>
  runLog.push(`${new Date().toISOString()}: ${currentState}->${newState}\n`);

/**
 * Updates the current state and sends state messages to various services.
 * @param {string} newState - The new state.
 */
const updateState = async (newState) => {
  appendToLog(newState);
  sendState(newState, 'state-service1');
  if (newState === 'SHUTDOWN') {
    sendState(newState, 'state-service2');
    sendState(newState, 'state-monitor');
  }
  currentState = newState;
  if (newState === 'INIT') await updateState('RUNNING');
  if (newState === 'SHUTDOWN') await shutDownServer();
};

/**
 * Sends a state message to a specific service.
 * @param {string} newState - The new state.
 * @param {string} routingKey - The routing key for the service queue.
 */
const sendState = async (newState, routingKey) =>
  sendMessage({ amqpChannel, routingKey, msg: newState });

/**
 * Validates if the provided state is valid.
 * @param {string} newState - The new state.
 * @returns {boolean} - True if the state is valid, false otherwise.
 */
const isValidState = (newState) =>
  ['INIT', 'RUNNING', 'PAUSED', 'SHUTDOWN'].includes(newState);

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
 * Sends a message to the AMQP channel with a specific routing key.
 * @param {Object} options - The options for sending a message.
 * @param {Channel} options.amqpChannel - The AMQP channel.
 * @param {string} options.routingKey - The routing key for the message.
 * @param {string} options.msg - The message content.
 */
const sendMessage = ({ amqpChannel, routingKey, msg }) => {
  if (!amqpChannel) return;
  amqpChannel.publish('topic_state', routingKey, Buffer.from(msg, 'utf-8'), {
    persistent: false,
  });
};

/**
 * Express route to reset the run log and update the state to 'INIT'.
 */
app.post('/reset', async (req, res) => {
  runLog.splice(0, runLog.length);
  await updateState('INIT');
  res.status(200).send();
});

/**
 * Handles server shutdown gracefully.
 */
const shutDownServer = async () => {
  console.log('Shutting down API gateway...');
  await amqpChannel?.close();
  server.close();
  process.exit(0);
};

// Handle graceful shutdown on SIGTERM and SIGINT signals
process.on('SIGTERM', shutDownServer);
process.on('SIGINT', shutDownServer);

// Start the server
const server = app.listen('8003', async () => {
  console.log(`API gateway running on port 8003`);

  amqpChannel = await initializeAmqp({
    queueNames: ['state-monitor', 'state-service1', 'state-service2'],
  });
  if (!amqpChannel) return;
  await updateState('RUNNING');
});
