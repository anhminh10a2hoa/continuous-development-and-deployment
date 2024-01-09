const express = require('express');
const dns = require('dns').promises;
const axios = require('axios');
const amqp = require('amqplib');

const app = express();
let httpServer;
let amqpChannel;
let currentState = 'PAUSED';
let messageCounter = 1;

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
    console.error(`Error during amqp initialization: ${err}`);
  }
};

const sendMessage = ({ message, channel, routingKey }) =>
  channel.publish('topic_state', routingKey, Buffer.from(message, 'utf-8'), {
    persistent: false
  });

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

const updateState = async (newState) => {
  currentState = newState === 'RUNNING' ? 'RUNNING' : 'PAUSED';
  if (newState === 'INIT') messageCounter = 1;
  if (newState === 'SHUTDOWN') await shutDownServer();
};

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

const sendMessages = async ({ address, channel }) => {
  const text = `SND ${messageCounter} ${new Date().toISOString()} ${address}`;
  console.log(text);

  sendMessage({ channel, routingKey: 'message', message: text });
  await sendMessageWithHTTP({ channel, text });
};

const startServer = async () =>
  (httpServer = app.listen(8001, async () => {
    console.log(`HTTP server running on port 8001`);

    amqpChannel = await initializeAmqp({
      queueNames: ['message', 'log', 'state-service1']
    });

    if (!amqpChannel) return;
    consumeMessages({ channel: amqpChannel, queueName: 'state-service1' });
    console.log(`Consuming state-service1 messages`);

    await messageLoop({ channel: amqpChannel });
  }));

const shutDownServer = async () => {
  console.log('Shutting down');
  await amqpChannel?.close();
  httpServer.close();
  process.exit(0);
};

void startServer();

process.on('SIGTERM', shutDownServer);
process.on('SIGINT', shutDownServer);
