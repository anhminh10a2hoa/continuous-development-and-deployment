// ci-test.js

const axios = require('axios');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testService1() {
  console.log("Testing Service 1...");

  // Perform testing logic for Service 1
  // Example: Send a request to Service 1 and check the response

  try {
    const response = await axios.get('http://localhost:8000'); // Update URL if needed
    console.log("Service 1 response:", response.data);
    // Add more assertions if needed
  } catch (error) {
    console.error("Error testing Service 1:", error.message);
    process.exit(1); // Exit with an error code
  }

  console.log("Service 1 test passed.");
}

async function testService2() {
  console.log("Testing Service 2...");

  // Perform testing logic for Service 2
  // Example: Send a request to Service 2 and check the response

  try {
    const response = await axios.get('http://localhost:8001'); // Update URL if needed
    console.log("Service 2 response:", response.data);
    // Add more assertions if needed
  } catch (error) {
    console.error("Error testing Service 2:", error.message);
    process.exit(1); // Exit with an error code
  }

  console.log("Service 2 test passed.");
}

async function testApiGateway() {
  console.log("Testing API Gateway...");

  // Perform testing logic for API Gateway
  // Example: Send requests to API Gateway and check the responses

  try {
    const responseMessages = await axios.get('http://localhost:8083/messages'); // Update URL if needed
    console.log("API Gateway /messages response:", responseMessages.data);
    // Add more assertions if needed

    const responseState = await axios.get('http://localhost:8083/state'); // Update URL if needed
    console.log("API Gateway /state response:", responseState.data);
    // Add more assertions if needed

    const responseRunLog = await axios.get('http://localhost:8083/run-log'); // Update URL if needed
    console.log("API Gateway /run-log response:", responseRunLog.data);
    // Add more assertions if needed
  } catch (error) {
    console.error("Error testing API Gateway:", error.message);
    process.exit(1); // Exit with an error code
  }

  console.log("API Gateway test passed.");
}

async function testMonitor() {
  console.log("Testing Monitor...");

  // Perform testing logic for Monitor
  // Example: Send requests to Monitor and check the responses

  try {
    const responseState = await axios.get('http://localhost:8003/state'); // Update URL if needed
    console.log("Monitor /state response:", responseState.data);
    // Add more assertions if needed

    const responseRunLog = await axios.get('http://localhost:8003/run-log'); // Update URL if needed
    console.log("Monitor /run-log response:", responseRunLog.data);
    // Add more assertions if needed
  } catch (error) {
    console.error("Error testing Monitor:", error.message);
    process.exit(1); // Exit with an error code
  }

  console.log("Monitor test passed.");
}

async function main() {
  // Add more test functions if needed
  await testService1();
  await testService2();
  await testApiGateway();
  await testMonitor();
}

main().then(() => {
  console.log("All tests passed successfully.");
  process.exit(0); // Exit with a success code
}).catch(error => {
  console.error("Tests failed:", error.message);
  process.exit(1); // Exit with an error code
});