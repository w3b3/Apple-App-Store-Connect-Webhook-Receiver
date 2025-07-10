const config = {
    // Server Configuration
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    
    // Apple App Store Connect Configuration
    appStore: {
        webhookSecret: process.env.APP_STORE_WEBHOOK_SECRET,
        bundleId: process.env.APP_STORE_BUNDLE_ID,
        serverApi: {
            keyId: process.env.APP_STORE_SERVER_API_KEY_ID,
            issuerId: process.env.APP_STORE_SERVER_API_ISSUER_ID,
            privateKeyPath: process.env.APP_STORE_SERVER_API_PRIVATE_KEY_PATH,
        }
    },
    
    // Firebase Configuration
    firebase: {
        enabled: process.env.FIRESTORE_ENABLED === 'true',
        projectId: process.env.FIREBASE_PROJECT_ID
    },
    
    // API URLs
    apiUrls: {
        production: {
            storeKit: 'https://api.storekit.itunes.apple.com',
            testNotifications: 'https://api.storekit.itunes.apple.com/inApps/v1/notifications/test'
        },
        sandbox: {
            storeKit: 'https://api.storekit-sandbox.itunes.apple.com',
            testNotifications: 'https://api.storekit-sandbox.itunes.apple.com/inApps/v1/notifications/test'
        }
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
    
    // Service Information
    service: {
        name: 'Apple App Store Connect Webhook Receiver',
        version: '1.0.0',
        webhookPath: '/webhook/app-store-connect'
    }
};

// Helper functions
config.isProduction = () => config.nodeEnv === 'production';
config.isDevelopment = () => config.nodeEnv === 'development';

config.getApiUrl = (endpoint) => {
    const env = config.isProduction() ? 'production' : 'sandbox';
    return config.apiUrls[env][endpoint];
};

config.getTestNotificationUrl = (testNotificationToken = null) => {
    const baseUrl = config.getApiUrl('testNotifications');
    return testNotificationToken ? `${baseUrl}/${testNotificationToken}` : baseUrl;
};

module.exports = config; 