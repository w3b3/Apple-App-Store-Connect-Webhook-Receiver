const express = require('express');
const config = require('../config');
const authService = require('../auth');
const appleApiService = require('../services/appleApi');
const webhookHandlers = require('../handlers/webhookHandlers');
const Middleware = require('../middleware');

const router = express.Router();

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        service: config.service.name,
        version: config.service.version
    });
});

/**
 * Root endpoint
 */
router.get('/', (req, res) => {
    res.status(200).json({
        service: config.service.name,
        version: config.service.version,
        endpoints: {
            health: '/health',
            webhook: '/webhook/app-store-connect',
            serverNotifications: '/webhook/app-store-server-notifications',
            testNotification: '/test/request-notification',
            testNotificationStatus: '/test/notification-status/:token'
        }
    });
});

/**
 * Apple App Store Connect webhook endpoint
 */
router.post('/webhook/app-store-connect', async (req, res) => {
    try {
        const payload = req.body;
        const signature = req.headers['x-app-store-signature'];
        const webhookSecret = config.appStore.webhookSecret;

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
            return res.status(400).json(Middleware.createErrorResponse(400, 'Invalid JSON payload', parseError.message));
        }

        // Verify signature if secret is provided
        if (webhookSecret && signature) {
            if (!authService.verifyWebhookSignature(payloadString, signature, webhookSecret)) {
                console.error('Invalid webhook signature');
                return res.status(401).json(Middleware.createErrorResponse(401, 'Invalid signature'));
            }
            console.log('Webhook signature verified successfully');
        } else if (webhookSecret && !signature) {
            console.warn('Webhook secret configured but no signature provided - this may be a test webhook');
        } else {
            console.log('No webhook secret configured - processing webhook without signature verification');
        }

        // Process the webhook based on event type
        const eventType = webhookData.data?.data?.type || webhookData.data?.type || webhookData.eventType;
        console.log('Processing event type:', eventType);

        // Process the webhook event with metadata
        const metadata = {
            userAgent: req.headers['user-agent'],
            contentType: req.headers['content-type'],
            hasSignature: !!signature,
            signatureVerified: webhookSecret && signature ? authService.verifyWebhookSignature(payloadString, signature, webhookSecret) : false
        };
        
        const result = await webhookHandlers.processWebhookEvent(webhookData, eventType, metadata);

        res.status(200).json({ 
            status: 'success',
            message: 'Webhook processed successfully',
            eventType: eventType,
            timestamp: new Date().toISOString(),
            stored: result?.success || false
        });

    } catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).json(Middleware.createErrorResponse(500, 'Internal server error', error.message));
    }
});

/**
 * Apple App Store Server Notifications endpoint
 */
router.post('/webhook/app-store-server-notifications', async (req, res) => {
    try {
        const payload = req.body;
        
        // Log the incoming server notification
        console.log('Received App Store Server Notification:', {
            timestamp: new Date().toISOString(),
            headers: {
                'user-agent': req.headers['user-agent'],
                'content-type': req.headers['content-type']
            },
            payloadSize: Buffer.isBuffer(payload) ? payload.length : JSON.stringify(payload).length
        });

        // Convert buffer to string for parsing
        const payloadString = Buffer.isBuffer(payload) ? payload.toString('utf8') : JSON.stringify(payload);
        
        // Parse JSON payload
        let notificationData;
        try {
            notificationData = JSON.parse(payloadString);
        } catch (parseError) {
            console.error('Failed to parse server notification payload:', parseError);
            return res.status(400).json(Middleware.createErrorResponse(400, 'Invalid JSON payload', parseError.message));
        }

        // App Store Server Notifications always have a signedPayload
        if (!notificationData.signedPayload) {
            console.error('Missing signedPayload in server notification');
            return res.status(400).json(Middleware.createErrorResponse(400, 'Missing signedPayload'));
        }

        // Verify JWT signature
        let decodedPayload;
        try {
            console.log('Verifying JWT signature for server notification...');
            decodedPayload = await authService.verifyAppleJWT(notificationData.signedPayload);
            console.log('JWT signature verified successfully');
        } catch (jwtError) {
            console.error('JWT signature verification failed:', jwtError.message);
            return res.status(401).json(Middleware.createErrorResponse(401, 'Invalid JWT signature', jwtError.message));
        }
        
        // Process the server notification with decoded payload and metadata
        const metadata = {
            userAgent: req.headers['user-agent'],
            contentType: req.headers['content-type'],
            jwtVerified: true,
            signatureVerified: true
        };
        
        const result = await webhookHandlers.processServerNotification(notificationData, decodedPayload, metadata);

        res.status(200).json({ 
            status: 'success',
            message: 'Server notification processed successfully',
            timestamp: new Date().toISOString(),
            stored: result?.success || false
        });

    } catch (error) {
        console.error('Error processing server notification:', error);
        res.status(500).json(Middleware.createErrorResponse(500, 'Internal server error', error.message));
    }
});

/**
 * Test notification endpoints
 */
router.post('/test/request-notification', async (req, res) => {
    try {
        console.log('Requesting test notification from Apple...');
        
        const result = await appleApiService.requestTestNotification();
        
        if (result.success) {
            console.log('Test notification requested successfully:', result.testNotificationToken);
            res.status(200).json({
                status: 'success',
                message: 'Test notification requested successfully',
                testNotificationToken: result.testNotificationToken,
                environment: result.environment,
                timestamp: result.timestamp,
                instructions: {
                    checkStatus: `GET /test/notification-status/${result.testNotificationToken}`,
                    note: 'The test notification should arrive at your webhook endpoint within a few minutes'
                }
            });
        } else {
            console.error('Failed to request test notification:', result.error);
            res.status(result.statusCode || 500).json({
                status: 'error',
                message: 'Failed to request test notification',
                error: result.error,
                environment: result.environment,
                timestamp: result.timestamp
            });
        }
    } catch (error) {
        console.error('Error requesting test notification:', error);
        res.status(500).json(Middleware.createErrorResponse(500, 'Internal server error', error.message));
    }
});

router.get('/test/notification-status/:token', async (req, res) => {
    try {
        const testNotificationToken = req.params.token;
        
        if (!testNotificationToken) {
            return res.status(400).json(Middleware.createErrorResponse(400, 'Missing test notification token'));
        }
        
        console.log('Checking test notification status:', testNotificationToken);
        
        const result = await appleApiService.getTestNotificationStatus(testNotificationToken);
        
        if (result.success) {
            console.log('Test notification status retrieved successfully');
            res.status(200).json({
                status: 'success',
                message: 'Test notification status retrieved successfully',
                testNotificationToken: testNotificationToken,
                notificationStatus: result.status,
                environment: result.environment,
                timestamp: result.timestamp
            });
        } else {
            console.error('Failed to get test notification status:', result.error);
            res.status(result.statusCode || 500).json({
                status: 'error',
                message: 'Failed to get test notification status',
                error: result.error,
                testNotificationToken: testNotificationToken,
                environment: result.environment,
                timestamp: result.timestamp
            });
        }
    } catch (error) {
        console.error('Error getting test notification status:', error);
        res.status(500).json(Middleware.createErrorResponse(500, 'Internal server error', error.message));
    }
});

module.exports = router; 