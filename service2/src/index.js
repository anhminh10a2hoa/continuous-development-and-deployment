const express = require('express');
const amqp = require('amqplib');

const app = express();
const PORT = 8001;
const RABBITMQ_URL = 'amqp://rabbitmq';

// Assuming Service 2 sends messages continuously when in RUNNING state
setInterval(async () => {
    const newMessage = 'Hello from Service 2';

    try {
        const connection = await amqp.connect(RABBITMQ_URL);
        const channel = await connection.createChannel();
        await channel.assertQueue('messages');
        channel.sendToQueue('messages', Buffer.from(newMessage));
        await connection.close();

        console.log(`Sent message to RabbitMQ: ${newMessage}`);
    } catch (error) {
        console.error(error);
    }
}, 1000);

app.listen(PORT, () => {
    console.log(`Service 2 is running on port ${PORT}`);
});
