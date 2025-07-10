const config = {
    // Server Configuration
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    
    // Provider-specific configuration (to be customized per service)
    provider: {
        name: process.env.PROVIDER_NAME || 'PROVIDER_NAME_PLACEHOLDER',
        webhookSecret: process.env.WEBHOOK_SECRET,
        // Add provider-specific config here
    },
    
    // Firebase Configuration
    firebase: {
        enabled: process.env.FIRESTORE_ENABLED === 'true',
        projectId: process.env.FIREBASE_PROJECT_ID
    },
    
    // Application Constants
    constants: {
        maxRetries: 3,
        requestTimeout: 30000,
        maxPayloadSize: '10mb',
        jwtExpiration: 3600, // 1 hour
        retryableErrors: [
            'UNAVAILABLE',
            'DEADLINE_EXCEEDED',
            'RESOURCE_EXHAUSTED',
            'INTERNAL',
            'ABORTED'
        ]
    },
    
    // Service Information (to be customized per service)
    service: {
        name: 'SERVICE_NAME_PLACEHOLDER',
        version: '1.0.0',
        webhookPath: '/webhook/PROVIDER_PATH_PLACEHOLDER'
    }
};

// Helper functions
config.isProduction = () => config.nodeEnv === 'production';
config.isDevelopment = () => config.nodeEnv === 'development';

// Provider-specific helper functions (to be customized per service)
config.getApiUrl = (endpoint) => {
    // Implement provider-specific API URL logic
    return 'PROVIDER_API_URL_PLACEHOLDER';
};

module.exports = config; 