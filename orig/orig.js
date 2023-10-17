const { Server, ServerCredentials } = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const packageDefinition = protoLoader.loadSync(path.resolve(__dirname, 'orig.proto'), {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const grpc = require('@grpc/grpc-js');

const origProto = grpc.loadPackageDefinition(packageDefinition).orig.ORIG.service;

const server = new Server();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

server.addService(origProto, {
  sendMessage: async (call, callback) => {
    const messages = ['MSG_1', 'MSG_2', 'MSG_3'];
    for (const message of messages) {
      console.log(`Sending message: ${message}`);
      await sleep(3000); // Wait for 3 seconds
      call.write({ message });
    }
    call.end();
  },
});

server.bindAsync('0.0.0.0:50051', ServerCredentials.createInsecure(), () => {
  server.start();
});
