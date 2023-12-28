FROM node:15

WORKDIR /service2

COPY package*.json ./

RUN npm install

COPY . .

COPY ./utils/wait-for-it.sh ./service2/wait-for-it.sh
RUN chmod +x ./service2/wait-for-it.sh

EXPOSE 8000

# Wait for rabbitmq to be up
CMD ["./service2/wait-for-it.sh", "rabbitmq:5672", "--timeout=0", "--", "node", "service2.js"]
