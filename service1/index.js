const express = require('express');
const dns = require('dns');
const axios = require('axios');
const amqp = require('amqplib');

const app = express();
let server;
let channel;
let state = 'PAUSED';
let counter = 1;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const getAddress = async ({ serviceName }) => {
  try {
    return (await dns.promises.lookup(serviceName)).address;
  } catch (error) {
    console.log(`Encountered an error during address lookup: ${error}`);
  }
};

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
    console.log(err);
  }
};

const sendMessage = ({ msg, channel, routingKey }) =>
  channel.publish('topic_state', routingKey, Buffer.from(msg, 'utf-8'), {
    persistent: false
  });

const sendMessageWithHTTP = async ({ channel, text }) => {
  try {
    const res = await axios.post('http://service2:8000', { log: text });

    sendMessage({
      channel,
      routingKey: 'log',
      msg: `${res.status} ${new Date().toISOString()}\n`
    });
  } catch (error) {
    if (axios.isAxiosError(error))
      sendMessage({
        channel,
        routingKey: 'log',
        msg: `${error.request ? error.message : error.message}\n`
      });
  }
};

const consumeMessages = ({ channel, queueName }) =>
  channel.consume(
    queueName,
    async (msg) => {
      if (!msg) return;
      channel.ack(msg);

      const newState = msg.content.toString('utf8');
      if (state !== 'INIT' && state !== 'PAUSED' && state !== 'RUNNING' && state !== 'SHUTDOWN') return;
      await updateState(newState);
    },
    { noAck: false }
  );

const updateState = async (newState) => {
  state = newState === 'RUNNING' ? 'RUNNING' : 'PAUSED';
  if (newState === 'INIT') counter = 1;
  if (newState === 'SHUTDOWN') await shutDownServer();
};

const messageLoop = async ({ address, channel }) => {
  if (state === 'RUNNING') {
    await sendMessages({ address, channel });
    counter += 1;
  }
  await delay(2000);
  await messageLoop({ address, channel });
};

const sendMessages = async ({ address, channel }) => {
  const text = `SND ${counter} ${new Date().toISOString()} ${address}`;
  console.log(text);

  sendMessage({ channel, routingKey: 'message', msg: text });
  await sendMessageWithHTTP({ channel, text });
};

const startServer = async () =>
  (server = app.listen(8001, async () => {
    console.log(`HTTP server running on port 8001`);

    channel = await initializeAmqp({
      queueNames: [
        'message',
        'log',
        'state-service1'
      ]
    });
    if (!channel) return;
    consumeMessages({ channel, queueName: 'state-service1' });
    console.log(`Consuming state-service1 messages`);
    const address = await getAddress({ serviceName: 'service2' });
    if (!address) return;

    await messageLoop({ address: `${address}:8000`, channel });
  }));

const shutDownServer = async () => {
  console.log('Shutting down ✔️');
  await channel?.close();
  server.close();
  process.exit(0);
};

void startServer();

process.on('SIGTERM', shutDownServer);
process.on('SIGINT', shutDownServer);
