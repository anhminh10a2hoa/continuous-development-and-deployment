const express = require('express');
const bodyParser = require('body-parser');
const amqp = require('amqplib');

const app = express();
const PORT = 8002;
const RABBITMQ_URL = 'amqp://rabbitmq';

const messages = [];

app.use(bodyParser.json());

app.post('/send-message', async (req, res) => {
    const newMessage = req.body.message;

    try {
        const connection = await amqp.connect(RABBITMQ_URL);
        const channel = await connection.createChannel();
        await channel.assertQueue('messages');
        channel.sendToQueue('messages', Buffer.from(newMessage));
        await connection.close();

        messages.push(newMessage);
        console.log(`Sent message to RabbitMQ: ${newMessage}`);
        res.send('Message sent successfully');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/messages', (req, res) => {
    res.json(messages);
});

app.listen(PORT, () => {
    console.log(`Message Broker is running on port ${PORT}`);
});
