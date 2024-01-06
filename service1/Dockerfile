FROM node:15

WORKDIR /usr/src/application

COPY . .

RUN npm install

EXPOSE 8001

RUN ["chmod", "+x", "./wait-for-it.sh"]

ENTRYPOINT ./wait-for-it.sh rabbitmq:5672 --timeout=20 --quiet --strict -- node ./index.js