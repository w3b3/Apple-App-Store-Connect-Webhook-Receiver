const express = require('express');
const config = require('../config');
const StripeAuth = require('../auth');
const StripeWebhookHandlers = require('../handlers/webhookHandlers');
const Middleware = require('../middleware');

const router = express.Router();

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
    try {
        // Validate configuration
        config.validate();
        
        const healthStatus = {
            status: 'healthy',
            service: config.service.name,
            version: config.service.version,
            timestamp: new Date().toISOString(),
            environment: config.nodeEnv,
            port: config.port,
            webhookPath: config.service.webhookPath,
            stripe: {
                apiVersion: config.stripe.apiVersion,
                hasWebhookSecret: !!config.stripe.webhookSecret,
                hasSecretKey: !!config.stripe.secretKey,
                secretKeyFormat: StripeAuth.validateApiKeyFormat(config.stripe.secretKey),
                isLiveMode: StripeAuth.isLiveMode(config.stripe.secretKey)
            },
            firestore: {
                enabled: config.firebase.enabled,
                projectId: config.firebase.projectId || 'not-configured'
            },
            supportedEvents: config.constants.supportedEventTypes.length
        };

        res.status(200).json(healthStatus);
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Main Stripe webhook endpoint
 */
router.post('/webhook/stripe', 
    StripeAuth.webhookAuthMiddleware(),
    StripeWebhookHandlers.handleWebhook
);

/**
 * Configuration endpoint (development only)
 */
if (config.isDevelopment()) {
    router.get('/config', (req, res) => {
        const sanitizedConfig = {
            service: config.service,
            environment: config.nodeEnv,
            port: config.port,
            stripe: {
                apiVersion: config.stripe.apiVersion,
                hasWebhookSecret: !!config.stripe.webhookSecret,
                hasSecretKey: !!config.stripe.secretKey,
                secretKeyFormat: StripeAuth.validateApiKeyFormat(config.stripe.secretKey),
                isLiveMode: StripeAuth.isLiveMode(config.stripe.secretKey),
                maxNetworkRetries: config.stripe.maxNetworkRetries,
                timeout: config.stripe.timeout
            },
            firestore: {
                enabled: config.firebase.enabled,
                projectId: config.firebase.projectId || 'not-configured'
            },
            supportedEventTypes: config.constants.supportedEventTypes
        };
        
        res.json(sanitizedConfig);
    });
}

/**
 * Test endpoint for webhook simulation (development only)
 */
if (config.isDevelopment()) {
    router.post('/test/webhook', express.json(), async (req, res) => {
        try {
            const { eventType, data } = req.body;
            
            if (!eventType || !data) {
                return res.status(400).json({
                    error: 'Missing eventType or data in request body'
                });
            }
            
            if (!config.isEventTypeSupported(eventType)) {
                return res.status(400).json({
                    error: `Unsupported event type: ${eventType}`,
                    supportedTypes: config.constants.supportedEventTypes
                });
            }
            
            // Create a mock Stripe event
            const mockEvent = {
                id: `evt_test_${Date.now()}`,
                type: eventType,
                data: { object: data },
                created: Math.floor(Date.now() / 1000),
                livemode: false,
                api_version: config.stripe.apiVersion,
                pending_webhooks: 1
            };
            
            // Simulate the webhook processing
            const mockReq = {
                stripeEvent: mockEvent,
                signatureVerified: true,
                headers: { 'user-agent': 'Stripe-Test-Webhook' },
                ip: '127.0.0.1',
                path: '/test/webhook',
                method: 'POST'
            };
            
            const mockRes = {
                status: (code) => ({
                    json: (data) => {
                        res.status(code).json({
                            message: 'Test webhook processed',
                            mockEvent: mockEvent,
                            result: data
                        });
                    }
                })
            };
            
            await StripeWebhookHandlers.handleWebhook(mockReq, mockRes);
            
        } catch (error) {
            res.status(500).json({
                error: 'Test webhook failed',
                message: error.message
            });
        }
    });
}

/**
 * Stripe event types endpoint
 */
router.get('/events/supported', (req, res) => {
    res.json({
        supportedEventTypes: config.constants.supportedEventTypes,
        count: config.constants.supportedEventTypes.length,
        categories: {
            paymentIntents: config.constants.supportedEventTypes.filter(type => type.startsWith('payment_intent')),
            customers: config.constants.supportedEventTypes.filter(type => type.startsWith('customer')),
            subscriptions: config.constants.supportedEventTypes.filter(type => type.includes('subscription')),
            invoices: config.constants.supportedEventTypes.filter(type => type.startsWith('invoice')),
            charges: config.constants.supportedEventTypes.filter(type => type.startsWith('charge')),
            paymentMethods: config.constants.supportedEventTypes.filter(type => type.startsWith('payment_method'))
        }
    });
});

/**
 * Webhook signature verification test endpoint (development only)
 */
if (config.isDevelopment()) {
    router.post('/test/signature', express.raw({ type: 'application/json' }), (req, res) => {
        try {
            const signature = req.headers['stripe-signature'];
            const payload = req.body;
            
            if (!signature) {
                return res.status(400).json({
                    error: 'Missing stripe-signature header'
                });
            }
            
            const isValid = StripeAuth.verifyWebhookSignature(payload, signature);
            
            res.json({
                signatureValid: isValid,
                hasSignature: !!signature,
                payloadSize: payload.length,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            res.status(500).json({
                error: 'Signature test failed',
                message: error.message
            });
        }
    });
}

/**
 * Service information endpoint
 */
router.get('/info', (req, res) => {
    res.json({
        service: config.service.name,
        version: config.service.version,
        environment: config.nodeEnv,
        webhookPath: config.service.webhookPath,
        healthCheck: '/health',
        documentation: {
            supportedEvents: '/events/supported',
            configuration: config.isDevelopment() ? '/config' : 'Available in development mode only',
            testWebhook: config.isDevelopment() ? '/test/webhook' : 'Available in development mode only'
        }
    });
});

/**
 * Catch all route for undefined endpoints
 */
router.use('*', (req, res) => {
    res.status(404).json(
        Middleware.createErrorResponse(404, 'Endpoint not found', `Path ${req.originalUrl} not found`)
    );
});

module.exports = router; 