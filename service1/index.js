const express = require('express');
const dns = require('dns').promises;
const axios = require('axios');
const amqp = require('amqplib');

const app = express();
let httpServer;
let amqpChannel;
let currentState = 'PAUSED';
let messageCounter = 1;

/**
 * Initializes the AMQP connection and channels.
 * @param {Object} options - Configuration options, including queue names.
 * @returns {Promise<Channel>} - A promise resolving to the AMQP channel.
 */
const initializeAmqp = async ({ queueNames }) => {
  try {
    const connection = await amqp.connect('amqp://minhhoang:1234@rabbitmq');
    const channel = await connection.createChannel();
    channel.assertExchange('topic_state', 'direct', { durable: true });

    for (const queueName of queueNames) {
      await channel.assertQueue(queueName, { durable: false });
      await channel.bindQueue(queueName, 'topic_state', queueName);
    }

    return channel;
  } catch (error) {
    console.error(`Error during AMQP initialization: ${error}`);
  }
};

/**
 * Sends a message to an AMQP exchange.
 * @param {Object} params - Message parameters, including channel, routingKey, and message text.
 */
const sendMessage = ({ channel, routingKey, message }) =>
  channel.publish('topic_state', routingKey, Buffer.from(message, 'utf-8'), {
    persistent: false
  });

/**
 * Sends a message to an external HTTP service and logs the response.
 * @param {Object} params - Parameters, including channel and text to send.
 */
const sendMessageWithHTTP = async ({ channel, text }) => {
  try {
    const response = await axios.post('http://service2:8000', { log: text });

    sendMessage({
      channel,
      routingKey: 'log',
      message: `${response.status} ${new Date().toISOString()}\n`
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      sendMessage({
        channel,
        routingKey: 'log',
        message: `${error.request ? error.message : error.message}\n`
      });
    }
  }
};

/**
 * Consumes messages from an AMQP queue and updates the application state.
 * @param {Object} params - Parameters, including channel and queueName.
 */
const consumeMessages = ({ channel, queueName }) =>
  channel.consume(
    queueName,
    async (message) => {
      if (!message) return;
      channel.ack(message);

      const newState = message.content.toString('utf8');
      if (!['INIT', 'PAUSED', 'RUNNING', 'SHUTDOWN'].includes(newState)) return;
      await updateState(newState);
    },
    { noAck: false }
  );

/**
 * Updates the application state based on a new state received from messages.
 * @param {string} newState - The new state received from messages.
 */
const updateState = async (newState) => {
  currentState = newState === 'RUNNING' ? 'RUNNING' : 'PAUSED';
  if (newState === 'INIT') messageCounter = 1;
  if (newState === 'SHUTDOWN') await shutDownServer();
};

/**
 * Continuously sends messages to an external service and logs them.
 * @param {Object} params - Parameters, including channel.
 */
const messageLoop = async ({ channel }) => {
  while (true) {
    let address;

    try {
      address = (await dns.lookup('service2')).address;
    } catch (error) {
      console.error(`Error during address lookup: ${error}`);
      // Handle the error as needed, or continue the loop
      continue;
    }

    if (currentState === 'RUNNING') {
      await sendMessages({ address, channel });
      messageCounter += 1;
    }

    // Adding a sleep to simulate the delay
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
};

/**
 * Sends messages to an external service and logs them.
 * @param {Object} params - Parameters, including address and channel.
 */
const sendMessages = async ({ address, channel }) => {
  const text = `SND ${messageCounter} ${new Date().toISOString()} ${address}`;
  console.log(text);

  sendMessage({ channel, routingKey: 'message', message: text });
  await sendMessageWithHTTP({ channel, text });
};

/**
 * Starts the HTTP server and initializes the AMQP connection.
 */
const startServer = async () =>
  (httpServer = app.listen(8001, async () => {
    console.log(`Service 1 running on port 8001`);

    amqpChannel = await initializeAmqp({
      queueNames: ['message', 'log', 'state-service1']
    });

    if (!amqpChannel) return;
    consumeMessages({ channel: amqpChannel, queueName: 'state-service1' });
    console.log(`Consuming state-service1 messages`);

    await messageLoop({ channel: amqpChannel });
  }));

/**
 * Gracefully shuts down the server, closing AMQP connections and terminating the process.
 */
const shutDownServer = async () => {
  console.log('Shutting down service 1...');
  await amqpChannel?.close();
  httpServer.close();
  process.exit(0);
};

void startServer();

process.on('SIGTERM', shutDownServer);
process.on('SIGINT', shutDownServer);