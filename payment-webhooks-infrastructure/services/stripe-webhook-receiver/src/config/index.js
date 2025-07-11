const config = {
    // Server Configuration
    port: process.env.PORT || 3001,
    nodeEnv: process.env.NODE_ENV || 'development',
    
    // Stripe Configuration
    stripe: {
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
        secretKey: process.env.STRIPE_SECRET_KEY,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
        apiVersion: process.env.STRIPE_API_VERSION || '2023-10-16',
        maxNetworkRetries: parseInt(process.env.STRIPE_MAX_NETWORK_RETRIES) || 3,
        timeout: parseInt(process.env.STRIPE_TIMEOUT) || 30000,
    },
    
    // Firebase Configuration
    firebase: {
        enabled: process.env.FIRESTORE_ENABLED === 'true',
        projectId: process.env.FIREBASE_PROJECT_ID
    },
    
    // API URLs
    apiUrls: {
        stripe: 'https://api.stripe.com'
    },
    
    // Application Constants
    constants: {
        maxRetries: 3,
        requestTimeout: 30000,
        maxPayloadSize: '10mb',
        signatureHeader: 'stripe-signature',
        retryableErrors: [
            'UNAVAILABLE',
            'DEADLINE_EXCEEDED',
            'RESOURCE_EXHAUSTED',
            'INTERNAL',
            'ABORTED',
            'api_connection_error',
            'api_error',
            'rate_limit_error'
        ],
        // Stripe webhook event types to handle
        supportedEventTypes: [
            'payment_intent.succeeded',
            'payment_intent.payment_failed',
            'payment_intent.canceled',
            'payment_method.attached',
            'customer.created',
            'customer.updated',
            'customer.deleted',
            'customer.subscription.created',
            'customer.subscription.updated',
            'customer.subscription.deleted',
            'invoice.payment_succeeded',
            'invoice.payment_failed',
            'charge.succeeded',
            'charge.failed',
            'charge.dispute.created'
        ]
    },
    
    // Service Information
    service: {
        name: 'Stripe Webhook Receiver',
        version: '1.0.0',
        webhookPath: '/webhook/stripe'
    }
};

// Helper functions
config.isProduction = () => config.nodeEnv === 'production';
config.isDevelopment = () => config.nodeEnv === 'development';

config.getStripeApiUrl = (endpoint = '') => {
    return `${config.apiUrls.stripe}${endpoint}`;
};

config.isEventTypeSupported = (eventType) => {
    return config.constants.supportedEventTypes.includes(eventType);
};

config.getStripeConfig = () => {
    return {
        apiVersion: config.stripe.apiVersion,
        maxNetworkRetries: config.stripe.maxNetworkRetries,
        timeout: config.stripe.timeout,
    };
};

// Validation
config.validate = () => {
    const required = [
        'STRIPE_WEBHOOK_SECRET',
        'STRIPE_SECRET_KEY'
    ];
    
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    
    return true;
};

module.exports = config; 