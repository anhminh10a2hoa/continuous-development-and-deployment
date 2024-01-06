const express = require('express');
const axios = require('axios');
const amqp = require('amqplib');
const app = express();
let channel;
let state = 'INIT';
const runLog = [];

app.use(express.text());

app.get('/messages', async (req, res) => {
  try {
    const messagesLogResponse = await axios.get('http://monitor:8002');
    const messagesLog = messagesLogResponse.data;
    res.setHeader('Content-Type', 'text/plain').status(200).send(messagesLog);
  } catch (err) {
    res.status(404).send();
  }
});

app.get('/run-log', async (req, res) => {
  res.setHeader('Content-Type', 'text/plain').status(200).send(runLog.join(''));
});

app.get('/state', async (req, res) => {
  res.setHeader('Content-Type', 'text/plain').status(200).send(state);
});

app.put('/state', async (req, res) => {
  const newState = req.body;
  if (newState !== 'INIT' && newState !== 'RUNNING' && newState !== 'SHUTDOWN' && newState !== 'PAUSED') {
    res.sendStatus(400).send();
    return;
  }
  if (state === newState) {
    res.setHeader('Content-Type', 'text/plain').status(200).send(state);
    return;
  }
  await updateState(newState);
  res.setHeader('Content-Type', 'text/plain').status(200).send(state);
});

const appendToLog = (newState) =>
  runLog.push(`${new Date().toISOString()}: ${state}->${newState}\n`);

const updateState = async (newState) => {
  appendToLog(newState);
  sendState(newState, 'state-service1');
  if (newState === 'SHUTDOWN') {
    sendState(newState, 'state-service2');
    sendState(newState, 'state-monitor');
  }
  state = newState;
  if (newState === 'INIT') await updateState('RUNNING');
  if (newState === 'SHUTDOWN') await shutDownServer();
};

const sendState = async (newState, routingKey) =>
  sendMessage({ channel, routingKey, msg: newState });

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

const sendMessage = ({ msg, channel, routingKey }) => {
  if (!channel) return;
  channel.publish('topic_state', routingKey, Buffer.from(msg, 'utf-8'), {
    persistent: false
  });
};

app.post('/reset', async (req, res) => {
  runLog.splice(0, runLog.length);
  await updateState('INIT');
  res.status(200).send();
});

const server = app.listen('8003', async () => {
  console.log(`HTTP server running on port 8003`);

  channel = await initializeAmqp({
    queueNames: [
      'state-monitor',
      'state-service1',
      'state-service2'
    ]
  });
  if (!channel) return;
  await updateState('RUNNING');
});

const shutDownServer = async () => {
  console.log('Shutting down');
  await channel?.close();
  server.close();
  process.exit(0);
};

process.on('SIGTERM', shutDownServer);
process.on('SIGINT', shutDownServer);