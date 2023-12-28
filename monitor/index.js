const express = require('express');
const amqp = require('amqplib');

const app = express();
app.use(express.json());

const PORT = 8087;
const RABBITMQ_URL = 'amqp://rabbitmq';
let logMessages = [];
let channel;

app.listen(PORT, () => {
	console.log(`Monitor listening to port ${PORT}`);
});

amqp.connect(RABBITMQ_URL, (error, connection) => {
	if (error) {
		throw error;
	}

	channel = connection.createChannel();

	channel.assertExchange('log', 'topic', { durable: false });
	channel.assertQueue('logQueue', { durable: false });
	channel.bindQueue('logQueue', 'log', 'monitor');

	channel.consume('logQueue', (message) => {
		const logMessage = message.content.toString();
		logMessages.push(logMessage);
	});
});

app.get('/', (request, response) => {
	response.setHeader('Content-Type', 'text/plain');
	response.send(logMessages.join('\n'));
});

process.on('SIGTERM', () => {
	channel.close();
	process.exit(0);
});
