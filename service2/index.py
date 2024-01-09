from http.server import HTTPServer, BaseHTTPRequestHandler
import functools
import sys
import threading
import os
import time
import pika
import json

# Configuration constants
HOST_NAME = "0.0.0.0"
SERVER_PORT = 8000
RABBITMQ_USER = "minhhoang"
RABBITMQ_PASS = "1234"
RABBITMQ_URL = f"amqp://{RABBITMQ_USER}:{RABBITMQ_PASS}@rabbitmq"
RABBITMQ_EXCHANGE = "messages"
RABBITMQ_MESSAGE_QUEUE = "message"
RABBITMQ_STATE_QUEUE = "state-service2"
RABBITMQ_LOG_QUEUE = "log"

CONFIG = {"url": RABBITMQ_URL, "exchange": RABBITMQ_EXCHANGE}

class RabbitMQConsumer:
    def __init__(self, consume_queue, produce_queue, config):
        self.consume_queue = consume_queue
        self.produce_queue = produce_queue
        self.config = config
        self.connection = self._create_connection()

    def __del__(self):
        self.connection.close()

    def _create_connection(self):
        parameters = pika.URLParameters(self.config["url"])
        return pika.BlockingConnection(parameters)

    def _on_message_callback(self, channel, method, properties, body):
        new_text = body.decode("utf-8") + " MSG\n"
        print(f"RABBITMQ: {new_text}", end="")
        channel.basic_publish(
            exchange=self.config["exchange"],
            routing_key=self.produce_queue,
            body=new_text,
        )

    def _on_state_callback(self, channel, method, properties, body):
        state = body.decode("utf-8")
        if state == "SHUTDOWN":
            print("Shutting down")
            channel.close()
            os._exit(1)

    def setup(self):
        channel = self.connection.channel()
        channel.exchange_declare(
            exchange=self.config["exchange"], exchange_type="direct", durable=True
        )
        self._declare_and_bind_queues(channel)
        print(f"Consuming {self.consume_queue}")
        try:
            channel.start_consuming()
        except KeyboardInterrupt:
            print(f"Stopping consuming {self.consume_queue}")
            channel.stop_consuming()

    def _declare_and_bind_queues(self, channel):
        queues = [self.consume_queue, RABBITMQ_STATE_QUEUE, self.produce_queue]
        for queue in queues:
            channel.queue_declare(queue=queue, durable=False)
            channel.queue_bind(
                exchange=self.config["exchange"],
                queue=queue,
                routing_key=queue,
            )
        channel.basic_consume(
            queue=self.consume_queue,
            on_message_callback=self._on_message_callback,
            auto_ack=True,
        )
        channel.basic_consume(
            queue=RABBITMQ_STATE_QUEUE,
            on_message_callback=self._on_state_callback,
            auto_ack=True,
        )

class HTTPRequestHandler(BaseHTTPRequestHandler):
    def __init__(self, *args, channel=None, exchange=None, produce_queue_name=None, **kwargs):
        self.channel = channel
        self.exchange = exchange
        self.produce_queue_name = produce_queue_name
        super().__init__(*args, **kwargs)

    def do_POST(self):
        length = int(self.headers.get("content-length"))
        data = json.loads(self.rfile.read(length))
        if data.get("log"):
            log = data["log"]
            [address, port] = self.client_address
            new_log = f"{log} {address}:{port}\n"
            print(f"HTTP: {new_log}", end="")
            self.channel.basic_publish(
                exchange=self.exchange,
                routing_key=self.produce_queue_name,
                body=new_log,
            )
            self._respond(200, "text/plain", "ok")

    def _respond(self, status, content_type, content):
        self.send_response(status)
        self.send_header("Content-type", content_type)
        self.end_headers()
        self.wfile.write(bytes(content, "UTF-8"))

    def log_message(self, format, *args):
        pass

def create_rabbitmq_connection(url):
    parameters = pika.URLParameters(url)
    return pika.BlockingConnection(parameters)

def setup_rabbitmq_channel(connection, exchange, produce_queue_name, consume_queue):
    channel = connection.channel()
    channel.exchange_declare(exchange=exchange, exchange_type="direct", durable=True)
    queues = [produce_queue_name, consume_queue, RABBITMQ_STATE_QUEUE]
    for queue in queues:
        channel.queue_declare(queue=queue, durable=False)
        channel.queue_bind(exchange=exchange, queue=queue, routing_key=queue)
    return channel

if __name__ == "__main__":
    time.sleep(2)
    connection = create_rabbitmq_connection(url=CONFIG["url"])
    channel = setup_rabbitmq_channel(
        connection=connection,
        exchange=CONFIG["exchange"],
        produce_queue_name=RABBITMQ_LOG_QUEUE,
        consume_queue=RABBITMQ_MESSAGE_QUEUE,
    )
    handler_partial = functools.partial(
        HTTPRequestHandler,
        channel=channel,
        exchange=CONFIG["exchange"],
        produce_queue_name=RABBITMQ_LOG_QUEUE,
    )
    web_server = HTTPServer((HOST_NAME, SERVER_PORT), handler_partial)
    print(f"HTTP server running on port {SERVER_PORT}")

    consumer = RabbitMQConsumer(
        consume_queue=RABBITMQ_MESSAGE_QUEUE,
        produce_queue=RABBITMQ_LOG_QUEUE,
        config=CONFIG,
    )
    thread = threading.Thread(target=consumer.setup, args=())
    thread.start()

    try:
        web_server.serve_forever()
    except KeyboardInterrupt:
        pass

    print("Shutting down")
    web_server.server_close()
    connection.close()
    sys.exit(0)
