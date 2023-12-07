const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const PORT = 8083;

app.use(bodyParser.json());

app.get('/messages', async (req, res) => {
    try {
        const response = await axios.get('http://monitor-service/messages');
        res.send(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.put('/state', async (req, res) => {
    const newState = req.body.state;

    try {
        await axios.put('http://monitor-service/state', { state: newState });
        res.send('State updated successfully');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/state', async (req, res) => {
    try {
        const response = await axios.get('http://monitor-service/state');
        res.send(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/run-log', async (req, res) => {
    try {
        const response = await axios.get('http://monitor-service/run-log');
        res.send(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.listen(PORT, () => {
    console.log(`API Gateway is running on port ${PORT}`);
});
