const grpc = require('@grpc/grpc-js');
const path = require('path');
const protoLoader = require('@grpc/proto-loader');

const packageDefinition = protoLoader.loadSync(path.resolve(__dirname, 'orig.proto'), {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const origProto = grpc.loadPackageDefinition(packageDefinition).orig.ORIG.service;
const client = new origProto('localhost:50051', grpc.credentials.createInsecure());

const call = client.sendMessage({});

call.on('data', (data) => {
  console.log(`Received: ${data.message}`);
});

call.on('end', () => {
  console.log('Received all messages from ORIG.');
});
