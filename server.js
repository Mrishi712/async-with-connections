// server.js
import express, { json } from 'express';
import axios from 'axios';
import { createLogger, format as _format, transports as _transports } from 'winston';

const app = express();
const port = 3030;

// Logger setup
const logger = createLogger({
    level: 'info',
    format: _format.combine(
        _format.timestamp(),
        _format.json()
    ),
    transports: [
        new _transports.File({ filename: 'error.log', level: 'error' }),
        new _transports.Console()
    ]
});

const VALID_API_KEY = 'atheevasecretkey123';
// Middleware to check API key
const authenticateAPIKey = (req, res, next) => {
    // Check for API key in headers (e.g., Authorization: Bearer  or x-api-key: )
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.split('Bearer ')[1];
    // Alternatively, check query parameters or body (less common)
    // const apiKey = req.query.api_key || req.body.api_key;
    if (!apiKey) {
        return res.status(401).json({ error: 'API key is missing' });
    }
    if (apiKey !== VALID_API_KEY) {
        return res.status(403).json({ error: 'Invalid API key' });
    }
    // API key is valid, proceed to the next middleware/route
    next();
};

// Middleware
app.use(json());

app.use((req, res, next) => {
    logger.info('Request received:', {
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: req.body
    });
    next();
});

app.use(authenticateAPIKey)

// Callback handler
app.post('/callback', async (req, res) => {
    logger.info('Callback received:', { body: req.body });

    const callbackUrl = req.get('callbackUrl');
    if (!callbackUrl) {
        logger.error('Callback URL is missing');
        return res.status(400).send('Callback URL is missing');
    }

    let tenantId, correlationId;
    try {
        const parts = new URL(callbackUrl).pathname.split('/');
        tenantId = parts[2];
        correlationId = parts[3];
    } catch (error) {
        logger.error('Invalid callback URL format', { error: error.message });
        return res.status(400).send('Invalid callback URL format');
    }

    res.status(205).json({
        message: 'Callback received successfully'
    });

    await handlerAsyncResponse(callbackUrl, tenantId, correlationId);
});

// Simulated async handler
async function handlerAsyncResponse(callbackUrl, tenantId, correlationId) {
    await new Promise(resolve => setTimeout(resolve, 10000)); // Simulate delay

    try {
        const callbackResponse = await axios.post(callbackUrl, { data: 'This delay is after 10 seconds' }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        logger.info('Callback response sent successfully', {
            callbackUrl,
            response: callbackResponse.data,
            responseStatus: callbackResponse.status
        });
    } catch (error) {
        logger.error('Error sending callback response', {
            callbackUrl,
            error: error.message
        });
    }
}



// Error handler
app.use((err, req, res, next) => {
    logger.error('Unhandled error occurred', {
        message: err.message,
        stack: err.stack
    });
    res.status(500).send('Internal Server Error');
});

// Start server
app.listen(port, () => {
    logger.info(`Server is running on http://localhost:${port}`);
});