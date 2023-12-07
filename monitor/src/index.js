const express = require('express');
const bodyParser = require('body-parser');
const amqp = require('amqplib');

const app = express();
const PORT = 8003;
const RABBITMQ_URL = 'amqp://rabbitmq';

const stateLog = [];

app.use(bodyParser.json());

app.put('/state', async (req, res) => {
    const newState = req.body.state;

    try {
        const connection = await amqp.connect(RABBITMQ_URL);
        const channel = await connection.createChannel();
        await channel.assertQueue('states');
        channel.sendToQueue('states', Buffer.from(newState));
        await connection.close();

        stateLog.push(`${new Date().toISOString()}: ${stateLog.length > 0 ? stateLog[stateLog.length - 1] + '->' : ''}${newState}`);
        console.log(`Sent state to RabbitMQ: ${newState}`);
        res.send('State sent successfully');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/state', async (req, res) => {
    try {
        const connection = await amqp.connect(RABBITMQ_URL);
        const channel = await connection.createChannel();
        await channel.assertQueue('states');
        const stateMessage = await channel.get('states');
        await connection.close();

        const currentState = stateMessage ? stateMessage.content.toString() : 'INIT';
        res.send(currentState);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/run-log', (req, res) => {
    res.json(stateLog);
});

app.listen(PORT, () => {
    console.log(`Monitor is running on port ${PORT}`);
});
