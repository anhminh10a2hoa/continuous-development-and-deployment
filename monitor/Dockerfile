FROM node:15

WORKDIR /monitor

COPY package*.json ./

RUN npm install

COPY . .

COPY ./wait-for-it.sh ./monitor/wait-for-it.sh
RUN chmod +x ./monitor/wait-for-it.sh

# Wait for rabbitmq to be up
CMD ["./monitor/wait-for-it.sh", "rabbitmq:5672",  "--timeout=0", "--", "node", "monitor.js"]
