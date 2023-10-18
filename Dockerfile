# Use a Node.js runtime as the base image
FROM node:14

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install application dependencies
RUN npm install

# Copy the application source code into the container
COPY . .

# Expose the port the application will run on
EXPOSE 8080

# Command to start the application
CMD ["node", "app.js"]
