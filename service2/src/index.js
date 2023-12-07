const express = require('express');
const axios = require('axios');

const app = express();
const PORT = 8001;

// Assuming Service 2 sends messages continuously when in RUNNING state
setInterval(async () => {
    try {
        const response = await axios.get('http://monitor-service/state');
        if (response.data === 'RUNNING') {
            await axios.post('http://message-broker/send-message', { message: 'Hello from Service 2' });
        }
    } catch (error) {
        console.error(error);
    }
}, 1000);

app.listen(PORT, () => {
    console.log(`Service 2 is running on port ${PORT}`);
});
