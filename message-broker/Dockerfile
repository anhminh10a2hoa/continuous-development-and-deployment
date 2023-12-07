FROM node:15

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 8002

RUN npm ci

ENTRYPOINT node ./src/index.js
