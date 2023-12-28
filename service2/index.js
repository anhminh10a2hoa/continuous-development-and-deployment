const express = require('express');
const amqp = require('amqplib');

const app = express();
app.use(express.json());

const PORT = 8000;
const RABBITMQ_URL = 'amqp://rabbitmq';
let channel;

// Wait for 2 seconds before running the server
setTimeout(() => {
	app.listen(PORT, () => {
		console.log(`Service 2 running on port ${PORT}`);
	});

	// Create amqp connection
	amqp.connect(RABBITMQ_URL, (error, connection) => {
		if (error) {
			throw error;
		}

		channel = connection.createChannel();
		console.log('amqp connection for service 2 active');

		// Assert exchanges for topics "message" and "log"
		channel.assertExchange('message', 'topic', { durable: false });
		channel.assertExchange('log', 'topic', { durable: false });

		// Assert queue for topic "message" and bind it to the correct exchange
		channel.assertQueue('msgQueue', { durable: false });
		channel.bindQueue('msgQueue', 'message', 'service2');

		// Same as above for topic "log"
		channel.assertQueue('logQueue', { durable: false });
		channel.bindQueue('logQueue', 'log', 'monitor');

		// Listen for topic "message" queue
		channel.consume('msgQueue', (message) => {
			// Parse the received text with "MSG"
			const msgContent = message.content.toString();
			const newMsg = msgContent.replace(/\n/g, '') + ' MSG';

			// Send the new text back to broker with topic "log"
			channel.publish('log', 'monitor', Buffer.from(newMsg));
		});
	});

	// Route for receiving data POST requests from service 1
	app.post('/', (request, response) => {
		// Parse the message from the request
		const data = request.body.message;

		// Get the address and port from service 1 request
		const remoteAddress =
			request.headers['x-forwarded-for'] || request.socket.remoteAddress;

		const remotePort = request.socket.remotePort;

		// Parse the new log text together
		const text = data.replace(/\n/g, '');
		const newLogText = text + ' ' + remoteAddress + ':' + remotePort;

		// Send the parsed text to the broker
		channel.publish('log', 'monitor', Buffer.from(newLogText));
		response.end();
	});

	// Close the connection & exit on command
	process.on('SIGTERM', () => {
		channel.close();
		process.exit(0);
	});
}, 2000);
