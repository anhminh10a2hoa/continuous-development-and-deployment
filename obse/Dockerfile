FROM node:14

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

CMD [ "node", "obse.js" ]  # Adjust for each component