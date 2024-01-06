from http.server import HTTPServer, BaseHTTPRequestHandler
import functools
import sys
import threading
import os
import time
import pika
import json

HOST_NAME = "0.0.0.0"
SERVER_PORT = "8000"
RABBITMQ_NAME = "rabbitmq"
RABBITMQ_USER = "minhhoang"
RABBITMQ_PASS = "1234"
RABBITMQ_URL = "amqp://minhhoang:1234@rabbitmq"
RABBITMQ_TOPIC_MESSAGE = "message"
RABBITMQ_TOPIC_STATE_SERVICE2 = "state-service2"
RABBITMQ_TOPIC_LOG = "log"
CONFIG = {"url": RABBITMQ_URL, "exchange": "messages"}

class Consumer:
    def __init__(self, consume_msg_queue, consume_state_queue, produce_queue, config):
        self.consume_msg_queue = consume_msg_queue
        self.consume_state_queue = consume_state_queue
        self.produce_queue = produce_queue
        self.config = config
        self.connection = self._create_connection()

    def __del__(self):
        self.connection.close()

    def _create_connection(self):
        parameters = pika.URLParameters(self.config["url"])
        return pika.BlockingConnection(parameters)

    def on_message_callback(self, channel, method, properties, body):
        new_text = body.decode("utf-8") + " MSG\n"
        print(f"RABBITMQ: {new_text}", end="")
        channel.basic_publish(
            exchange=self.config["exchange"],
            routing_key=self.produce_queue,
            body=new_text,
        )

    def on_state_callback(self, channel, method, properties, body):
        state = body.decode("utf-8")
        if state == "SHUTDOWN":
            print("Shutting down ✔️")
            channel.close()
            os._exit(1)

    def setup(self):
        channel = self.connection.channel()
        channel.exchange_declare(
            exchange=self.config["exchange"], exchange_type="direct", durable=True
        )
        channel.queue_declare(queue=self.produce_queue, durable=False)
        channel.queue_bind(
            exchange=self.config["exchange"],
            queue=self.produce_queue,
            routing_key=self.produce_queue,
        )

        channel.queue_declare(queue=self.consume_msg_queue, durable=False)
        channel.queue_bind(
            exchange=self.config["exchange"],
            queue=self.consume_msg_queue,
            routing_key=self.consume_msg_queue,
        )
        channel.basic_consume(
            queue=self.consume_msg_queue,
            on_message_callback=self.on_message_callback,
            auto_ack=True,
        )

        channel.queue_declare(queue=self.consume_state_queue, durable=False)
        channel.queue_bind(
            exchange=self.config["exchange"],
            queue=self.consume_state_queue,
            routing_key=self.consume_state_queue,
        )
        channel.basic_consume(
            queue=self.consume_state_queue,
            on_message_callback=self.on_state_callback,
            auto_ack=True,
        )
        print("Consuming msgs 🥕")
        try:
            channel.start_consuming()
        except KeyboardInterrupt:
            print("Stopping consuming messages ✔️")
            channel.stop_consuming()

class Handler(BaseHTTPRequestHandler):
    def __init__(
        self, *args, channel=None, exchange=None, produce_queue_name=None, **kwargs
    ):
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
            self.respond(200, "text/plain", "ok")

    def respond(self, status, content_type, content):
        self.send_response(status)
        self.send_header("Content-type", content_type)
        self.end_headers()
        self.wfile.write(bytes(content, "UTF-8"))

    def log_message(self, format, *args):
        pass

def create_connection(url):
    parameters = pika.URLParameters(url)
    return pika.BlockingConnection(parameters)

def setup_channel(
    connection, exchange, produce_queue_name, consume_msg_queue, consume_state_queue
):
    channel = connection.channel()
    channel.exchange_declare(exchange=exchange, exchange_type="direct", durable=True)
    channel.queue_declare(queue=produce_queue_name, durable=False)
    channel.queue_bind(
        exchange=exchange, queue=produce_queue_name, routing_key=produce_queue_name
    )

    channel.queue_declare(queue=consume_msg_queue, durable=False)
    channel.queue_bind(
        exchange=exchange, queue=consume_msg_queue, routing_key=consume_msg_queue
    )

    channel.queue_declare(queue=consume_state_queue, durable=False)
    channel.queue_bind(
        exchange=exchange, queue=consume_state_queue, routing_key=consume_state_queue
    )
    return channel

if __name__ == "__main__":
    time.sleep(2)
    connection = create_connection(url=CONFIG["url"])
    channel = setup_channel(
        connection=connection,
        exchange=CONFIG["exchange"],
        produce_queue_name=RABBITMQ_TOPIC_LOG,
        consume_msg_queue=RABBITMQ_TOPIC_MESSAGE,
        consume_state_queue=RABBITMQ_TOPIC_STATE_SERVICE2,
    )

    handler_partial = functools.partial(
        Handler,
        channel=channel,
        exchange=CONFIG["exchange"],
        produce_queue_name=RABBITMQ_TOPIC_LOG,
    )
    webServer = HTTPServer((HOST_NAME, SERVER_PORT), handler_partial)
    print(f"HTTP server running on port {SERVER_PORT} 🔥")

    consumer = Consumer(
        consume_msg_queue=RABBITMQ_TOPIC_MESSAGE,
        consume_state_queue=RABBITMQ_TOPIC_STATE_SERVICE2,
        produce_queue=RABBITMQ_TOPIC_LOG,
        config=CONFIG,
    )
    thread = threading.Thread(target=consumer.setup, args=())
    thread.start()

    try:
        webServer.serve_forever()
    except KeyboardInterrupt:
        pass

    print("Shutting down ✔️")
    webServer.server_close()
    connection.close()
    sys.exit(0)
