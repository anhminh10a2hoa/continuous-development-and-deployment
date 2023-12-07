const express = require('express');
const axios = require('axios');

const app = express();
const PORT = 8000;

// Assuming Service 1 sends messages continuously
setInterval(async () => {
    try {
        await axios.post('http://message-broker/send-message', { message: 'Hello from Service 1' });
    } catch (error) {
        console.error(error);
    }
}, 1000);

app.listen(PORT, () => {
    console.log(`Service 1 is running on port ${PORT}`);
});
