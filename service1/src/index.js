const express = require('express');
const amqp = require('amqplib');

const app = express();
const PORT = 8000;
const RABBITMQ_URL = 'amqp://rabbitmq';

// Assuming Service 1 sends messages continuously
setInterval(async () => {
    const newMessage = 'Hello from Service 1';

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
    console.log(`Service 1 is running on port ${PORT}`);
});
