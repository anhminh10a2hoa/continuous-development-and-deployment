const { Server, ServerCredentials } = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const packageDefinition = protoLoader.loadSync(path.resolve(__dirname, 'imed.proto'), {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const grpc = require('@grpc/grpc-js');

const imedProto = grpc.loadPackageDefinition(packageDefinition).imed.IMED.service;

const server = new Server();

server.addService(imedProto, {
  publishMessage: async (call, callback) => {
    call.on('data', async (data) => {
      const message = data.message;
      console.log(`Received message: ${message}`);
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for 1 second
      call.write({ result: `Got ${message}` });
    });

    call.on('end', () => {
      call.end();
    });
  },
});

server.bindAsync('0.0.0.0:50051', ServerCredentials.createInsecure(), () => {
  server.start();
});
