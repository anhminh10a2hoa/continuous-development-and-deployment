const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = 8003;

const stateLog = [];

app.use(bodyParser.json());

app.put('/state', (req, res) => {
    const newState = req.body.state;
    stateLog.push(`${new Date().toISOString()}: ${stateLog.length > 0 ? stateLog[stateLog.length - 1] + '->' : ''}${newState}`);
    console.log(`State updated to: ${newState}`);
    res.send('State updated successfully');
});

app.get('/state', (req, res) => {
    const currentState = stateLog.length > 0 ? stateLog[stateLog.length - 1].split('->')[1] : 'INIT';
    res.send(currentState);
});

app.get('/run-log', (req, res) => {
    res.json(stateLog);
});

app.listen(PORT, () => {
    console.log(`Monitor is running on port ${PORT}`);
});
