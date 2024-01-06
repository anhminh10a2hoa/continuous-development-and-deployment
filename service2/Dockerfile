FROM python:3

WORKDIR /usr/src/app

COPY . .

RUN pip install --no-cache-dir pika

EXPOSE 8000

RUN ["chmod", "+x", "./wait-for-it.sh"]

ENTRYPOINT ./wait-for-it.sh rabbitmq:5672 --timeout=20 --quiet --strict -- python3 -u ./index.py