FROM node:15

WORKDIR /usr/src/app

COPY . .

RUN npm install

EXPOSE 8003

RUN ["chmod", "+x", "./wait-for-it.sh"]

ENTRYPOINT ./wait-for-it.sh rabbitmq:5672 --timeout=20 --quiet --strict -- node ./index.js