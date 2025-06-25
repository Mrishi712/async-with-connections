import express, { json } from 'express';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { createLogger, format as _format, transports as _transports } from 'winston';
const app = express();
const port = 8005;
// const VALID_API_KEY = process.env.API_KEY || 'atheeva_secret_key'; // Replace with your actual API key
// // Middleware to check for API Key
// function authenticateApiKey(req, res, next) {
//     const apiKey = req.headers['x-api-key'] || req.query.api_key;
//     if (!apiKey || apiKey !== VALID_API_KEY) {
//         return res.status(403).send('Forbidden: Invalid API Key');
//     }
//     next();
// }


const VALID_USERNAME = process.env.BASIC_AUTH_USERNAME || 'user';
const VALID_PASSWORD = process.env.BASIC_AUTH_PASSWORD || 'redhawk';

function authenticateBasicAuth(req, res, next) {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Basic ')) {
        return res.status(401).send('Unauthorized: Missing or invalid Authorization header');
    }

    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [username, password] = credentials.split(':');

    if (username !== VALID_USERNAME || password !== VALID_PASSWORD) {
        return res.status(403).send('Forbidden: Invalid credentials');
    }

    next();
}



// Configure Winston logger
const logger = createLogger({
    level: 'info',
    format: _format.combine(
        _format.timestamp(),
        _format.json()
    ),
    transports: [
        new _transports.File({ filename: 'combined.log' }),
        new _transports.Console()
    ]
});
//app.use(json());
// Middleware to log all incoming requests
app.use((req, res, next) => {
    logger.info('Incoming request', {
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: req.body
    });
    next();
});
app.post('/callback', async (req, res) => {
    logger.info('Received request', { data: req.body });
    const miliseconds = parseInt(req.body.time)
    const callbackUrl = req.get('callbackUrl');
    console.log("callback url is", callbackUrl)
    console.log("headers is", req.headers)
    // Validate callback URL
    if (!callbackUrl) {
        logger.error('Missing callback URL');
        return res.status(400).json({ error: 'X-Callback-URL header is required' });
    }
    let tenantId, correlationId;
    try {
        // Validate URL format
        const parts = new URL(callbackUrl).pathname.split('/');
        tenantId = parts[2];
        correlationId = parts[3];
    } catch (error) {
        logger.error('Invalid callback URL', { callbackUrl, error: error.message });
        return res.status(400).json({ error: 'Invalid callback URL' });
    }
    const myUuid = uuidv4();
    console.log("my uuid is", myUuid)
    res.status(205).json({ flow_instance_id: myUuid });
    handler_async_response(callbackUrl, tenantId, correlationId, miliseconds);

});
app.post('/callback_with_no_auth', async (req, res) => {
    logger.info('Received request', { data: req.body });
    const callbackUrl = req.get('callbackUrl');
    console.log("callback url is", callbackUrl)
    console.log("headers is", req.headers)
    // Validate callback URL
    if (!callbackUrl) {
        logger.error('Missing callback URL');
        return res.status(400).json({ error: 'X-Callback-URL header is required' });
    }
    let tenantId, correlationId;
    try {
        // Validate URL format
        const parts = new URL(callbackUrl).pathname.split('/');
        tenantId = parts[2];
        correlationId = parts[3];
    } catch (error) {
        logger.error('Invalid callback URL', { callbackUrl, error: error.message });
        return res.status(400).json({ error: 'Invalid callback URL' });
    }
    const myUuid = uuidv4();
    console.log("my uuid is", myUuid)
    res.status(205).json({ flow_instance_id: myUuid });
    handler_async_response(callbackUrl, tenantId, correlationId, miliseconds);

});

app.post('/log-payload', authenticateBasicAuth, (req, res) => {
    console.log("+++++++++++++++++++++++++++++++");
    console.log('Received payload', req.body);
    console.log("+++++++++++++++++++++++++++++++");
    res.json({ message: 'Payload received',payload: req.body });
});

async function handler_async_response(callbackUrl, tenantId, correlationId, milliseconds) {
    try {
        // Perform callback
        sleep(milliseconds)
        console.log("callback url is", callbackUrl)
        const callbackResponse = await axios.post(callbackUrl, { 'data': "QA Testing is in progress - RM" }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        logger.info('Callback successful', {
            callbackUrl,
            responseStatus: callbackResponse.status,
            responseData: callbackResponse.data
        });
    } catch (error) {
        logger.error('Callback failed', {
            callbackUrl,
            error: error.message,
            response: error.response?.data
        });
    }
}
function sleep(miliseconds) {
    let currentTime = new Date().getTime();
    while (currentTime + miliseconds >= new Date().getTime()) {
    }
}
// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Server error', {
        error: err.message,
        stack: err.stack
    });
    res.status(500).json({ error: 'Internal server error' });
});
app.listen(port, () => {
    logger.info(`Server running at http://localhost:${port}`);
});