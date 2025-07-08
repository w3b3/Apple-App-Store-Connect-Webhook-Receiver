const express = require('express');
const crypto = require('crypto');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to capture raw body for signature verification on webhook routes
app.use('/webhook', express.raw({ type: 'application/json', limit: '10mb' }));

// Middleware to parse JSON payloads for other routes
app.use(express.json({ limit: '10mb' }));

// Webhook signature verification
function verifyWebhookSignature(payload, signature, secret) {
    if (!signature || !secret) {
        return false;
    }
    
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload, 'utf8')
        .digest('hex');
    
    // Ensure both signatures have the same length for timingSafeEqual
    if (signature.length !== expectedSignature.length) {
        return false;
    }
    
    return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
    );
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        service: 'Apple App Store Connect Webhook Receiver',
        version: '1.0.0'
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.status(200).json({
        service: 'Apple App Store Connect Webhook Receiver',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            webhook: '/webhook/app-store-connect'
        }
    });
});

// Apple App Store Connect webhook endpoint
app.post('/webhook/app-store-connect', (req, res) => {
    try {
        const payload = req.body;
        const signature = req.headers['x-app-store-signature'];
        const webhookSecret = process.env.APP_STORE_WEBHOOK_SECRET;

        // Log the incoming webhook
        console.log('Received webhook:', {
            timestamp: new Date().toISOString(),
            headers: {
                'user-agent': req.headers['user-agent'],
                'content-type': req.headers['content-type'],
                'x-app-store-signature': signature ? 'present' : 'missing'
            },
            payloadSize: Buffer.isBuffer(payload) ? payload.length : JSON.stringify(payload).length
        });

        // Convert buffer to string for parsing
        const payloadString = Buffer.isBuffer(payload) ? payload.toString('utf8') : JSON.stringify(payload);
        
        // Parse JSON payload
        let webhookData;
        try {
            webhookData = JSON.parse(payloadString);
        } catch (parseError) {
            console.error('Failed to parse webhook payload:', parseError);
            return res.status(400).json({ error: 'Invalid JSON payload' });
        }

        // Verify signature if secret is provided
        if (webhookSecret && signature) {
            if (!verifyWebhookSignature(payloadString, signature, webhookSecret)) {
                console.error('Invalid webhook signature');
                return res.status(401).json({ error: 'Invalid signature' });
            }
            console.log('Webhook signature verified successfully');
        } else if (webhookSecret) {
            console.warn('Webhook secret configured but no signature provided');
        }

        // Process the webhook based on event type
        const eventType = webhookData.eventType;
        console.log('Processing event type:', eventType);

        // Process the webhook event
        processWebhookEvent(webhookData);

        res.status(200).json({ 
            status: 'success',
            message: 'Webhook processed successfully',
            eventType: eventType,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Process different webhook event types
function processWebhookEvent(event) {
    console.log('Processing webhook event:', {
        eventType: event.eventType,
        timestamp: new Date().toISOString(),
        data: event
    });

    switch (event.eventType) {
        case 'APP_STORE_VERSION_STATE_CHANGED':
            console.log('App Store version state changed:', event);
            break;
        case 'TESTFLIGHT_BETA_FEEDBACK_RECEIVED':
            console.log('TestFlight beta feedback received:', event);
            break;
        case 'SUBSCRIPTION_PURCHASED':
            console.log('Subscription purchased:', event);
            break;
        case 'SUBSCRIPTION_RENEWED':
            console.log('Subscription renewed:', event);
            break;
        case 'SUBSCRIPTION_EXPIRED':
            console.log('Subscription expired:', event);
            break;
        case 'SUBSCRIPTION_REFUNDED':
            console.log('Subscription refunded:', event);
            break;
        case 'SUBSCRIPTION_GRACE_PERIOD_EXPIRED':
            console.log('Subscription grace period expired:', event);
            break;
        case 'SUBSCRIPTION_OFFER_REDEEMED':
            console.log('Subscription offer redeemed:', event);
            break;
        case 'PING':
            console.log('Ping event received (test webhook):', event);
            break;
        default:
            console.log('Unknown event type:', event.eventType, event);
    }

    // TODO: Add Firestore integration here
    // For now, we'll just log the events
    // Future: storeEventInFirestore(event);
}

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
    console.log(`Apple App Store Connect Webhook Receiver started`);
    console.log(`Listening on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`Webhook endpoint: http://localhost:${PORT}/webhook/app-store-connect`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully');
    process.exit(0);
}); 