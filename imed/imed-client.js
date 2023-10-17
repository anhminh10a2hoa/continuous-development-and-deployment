const grpc = require('@grpc/grpc-js');
const path = require('path');
const protoLoader = require('@grpc/proto-loader');

const packageDefinition = protoLoader.loadSync(path.resolve(__dirname, 'imed.proto'), {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const imedProto = grpc.loadPackageDefinition(packageDefinition).imed.IMED.service;
const client = new imedProto.IMED('localhost:50051', grpc.credentials.createInsecure());

// Create a gRPC call and set up handlers
const call = client.publishMessage({}, (error, response) => {
  if (!error) {
    console.log(`Received response: ${response.result}`);
  } else {
    console.error('Error:', error);
  }
});

// Send messages
call.write({ message: 'my.o message 1' });
call.write({ message: 'my.o message 2' });
call.write({ message: 'my.o message 3' });

// End the call to indicate that you've finished sending messages
call.end();
