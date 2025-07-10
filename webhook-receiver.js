const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const jose = require('node-jose');
const admin = require('firebase-admin');
const fs = require('fs');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Firebase Admin SDK if Firestore is enabled
let db = null;
if (process.env.FIRESTORE_ENABLED === 'true') {
    try {
        // Initialize Firebase Admin SDK
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.applicationDefault(),
                projectId: process.env.FIREBASE_PROJECT_ID
            });
        }
        
        // Get Firestore database instance
        db = admin.firestore();
        console.log('Firestore initialized successfully');
        
        // Configure Firestore settings
        db.settings({
            timestampsInSnapshots: true
        });
        
    } catch (error) {
        console.error('Failed to initialize Firestore:', error);
        console.log('Continuing without Firestore integration');
    }
} else {
    console.log('Firestore integration disabled');
}





// Validate certificate chain (basic validation - in production you'd want more thorough validation)
function validateCertificateChain(x5cChain) {
    if (!x5cChain || !Array.isArray(x5cChain) || x5cChain.length === 0) {
        throw new Error('Invalid x5c certificate chain');
    }
    
    // Basic validation - check that we have at least one certificate
    if (x5cChain.length < 1) {
        throw new Error('Certificate chain must contain at least one certificate');
    }
    
    // In a production environment, you would:
    // 1. Verify each certificate in the chain
    // 2. Check that each certificate is signed by the next one in the chain
    // 3. Verify the root certificate against Apple's known root certificates
    // 4. Check certificate validity dates
    // 5. Verify certificate purposes and constraints
    
    console.log(`Certificate chain validation: ${x5cChain.length} certificates found`);
    return true;
}

// Verify Apple JWT signature using x5c certificate chain
async function verifyAppleJWT(token) {
    try {
        // First decode without verification to get the header and payload
        const decoded = jwt.decode(token, { complete: true });
        if (!decoded) {
            throw new Error('Invalid JWT token');
        }

        // Extract x5c certificate chain from header
        const x5cChain = decoded.header.x5c;
        if (!x5cChain) {
            throw new Error('No x5c certificate chain found in JWT header');
        }

        // Validate the certificate chain
        validateCertificateChain(x5cChain);

        // Get the leaf certificate (first in chain for Apple)
        const leafCertBase64 = x5cChain[0];
        const leafCertPem = `-----BEGIN CERTIFICATE-----\n${leafCertBase64}\n-----END CERTIFICATE-----`;

        // Use node-jose for JWT verification
        const key = await jose.JWK.asKey(leafCertPem, 'pem');
        const result = await jose.JWS.createVerify(key).verify(token);
        
        // Parse the payload
        const payload = JSON.parse(result.payload.toString());
        
        console.log('JWT verification successful');
        return payload;
        
    } catch (error) {
        console.error('JWT verification failed:', error.message);
        throw new Error(`JWT verification failed: ${error.message}`);
    }
}



// Create JWT for App Store Server API authentication
function createAppStoreServerAPIJWT() {
    const keyId = process.env.APP_STORE_SERVER_API_KEY_ID;
    const issuerId = process.env.APP_STORE_SERVER_API_ISSUER_ID;
    const privateKeyPath = process.env.APP_STORE_SERVER_API_PRIVATE_KEY_PATH;
    const bundleId = process.env.APP_STORE_BUNDLE_ID;

    if (!keyId || !issuerId || !privateKeyPath || !bundleId) {
        throw new Error('Missing required App Store Server API configuration. Check environment variables.');
    }

    try {
        // Read the private key file
        const privateKey = fs.readFileSync(privateKeyPath, 'utf8');

        // Create JWT header
        const header = {
            alg: 'ES256',
            kid: keyId,
            typ: 'JWT'
        };

        // Create JWT payload
        const now = Math.floor(Date.now() / 1000);
        const payload = {
            iss: issuerId,
            iat: now,
            exp: now + 3600, // 1 hour expiration
            aud: 'appstoreconnect-v1',
            bid: bundleId,
            nonce: crypto.randomUUID()
        };

        // Sign the JWT
        const token = jwt.sign(payload, privateKey, {
            algorithm: 'ES256',
            header: header
        });

        return token;
    } catch (error) {
        throw new Error(`Failed to create App Store Server API JWT: ${error.message}`);
    }
}

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

// Request a test notification from App Store Server API
async function requestTestNotification() {
    try {
        const token = createAppStoreServerAPIJWT();
        const environment = process.env.NODE_ENV === 'production' ? 'production' : 'sandbox';
        
        const url = environment === 'production' 
            ? 'https://api.storekit.itunes.apple.com/inApps/v1/notifications/test'
            : 'https://api.storekit-sandbox.itunes.apple.com/inApps/v1/notifications/test';

        const response = await axios.post(url, {}, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });

        return {
            success: true,
            testNotificationToken: response.data.testNotificationToken,
            environment: environment,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error('Failed to request test notification:', error);
        
        let errorMessage = 'Unknown error';
        let statusCode = 500;
        
        if (error.response) {
            errorMessage = error.response.data?.errorMessage || error.response.statusText || 'API request failed';
            statusCode = error.response.status;
        } else if (error.request) {
            errorMessage = 'No response received from Apple servers';
        } else {
            errorMessage = error.message;
        }

        return {
            success: false,
            error: errorMessage,
            statusCode: statusCode,
            environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
            timestamp: new Date().toISOString()
        };
    }
}

// Get test notification status from App Store Server API
async function getTestNotificationStatus(testNotificationToken) {
    try {
        const token = createAppStoreServerAPIJWT();
        const environment = process.env.NODE_ENV === 'production' ? 'production' : 'sandbox';
        
        const url = environment === 'production' 
            ? `https://api.storekit.itunes.apple.com/inApps/v1/notifications/test/${testNotificationToken}`
            : `https://api.storekit-sandbox.itunes.apple.com/inApps/v1/notifications/test/${testNotificationToken}`;

        const response = await axios.get(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });

        return {
            success: true,
            status: response.data,
            environment: environment,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error('Failed to get test notification status:', error);
        
        let errorMessage = 'Unknown error';
        let statusCode = 500;
        
        if (error.response) {
            errorMessage = error.response.data?.errorMessage || error.response.statusText || 'API request failed';
            statusCode = error.response.status;
        } else if (error.request) {
            errorMessage = 'No response received from Apple servers';
        } else {
            errorMessage = error.message;
        }

        return {
            success: false,
            error: errorMessage,
            statusCode: statusCode,
            environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
            timestamp: new Date().toISOString()
        };
    }
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
            webhook: '/webhook/app-store-connect',
            serverNotifications: '/webhook/app-store-server-notifications',
            testNotification: '/test/request-notification',
            testNotificationStatus: '/test/notification-status/:token'
        }
    });
});

// Apple App Store Connect webhook endpoint
app.post('/webhook/app-store-connect', async (req, res) => {
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
            return res.status(400).json(createErrorResponse(400, 'Invalid JSON payload', parseError.message));
        }

        // Verify signature if secret is provided
        if (webhookSecret && signature) {
            if (!verifyWebhookSignature(payloadString, signature, webhookSecret)) {
                console.error('Invalid webhook signature');
                return res.status(401).json(createErrorResponse(401, 'Invalid signature'));
            }
            console.log('Webhook signature verified successfully');
        } else if (webhookSecret && !signature) {
            console.warn('Webhook secret configured but no signature provided - this may be a test webhook');
            // For test webhooks, we'll continue processing but log the warning
        } else {
            console.log('No webhook secret configured - processing webhook without signature verification');
        }

        // Process the webhook based on event type
        // Apple sends event type in data.type, not eventType
        const eventType = webhookData.data?.data?.type || webhookData.data?.type || webhookData.eventType;
        console.log('Processing event type:', eventType);

        // Process the webhook event with metadata
        const metadata = {
            userAgent: req.headers['user-agent'],
            contentType: req.headers['content-type'],
            hasSignature: !!signature,
            signatureVerified: webhookSecret && signature ? verifyWebhookSignature(payloadString, signature, webhookSecret) : false
        };
        
        const result = await processWebhookEvent(webhookData, eventType, metadata);

        res.status(200).json({ 
            status: 'success',
            message: 'Webhook processed successfully',
            eventType: eventType,
            timestamp: new Date().toISOString(),
            stored: result?.success || false
        });

    } catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).json(createErrorResponse(500, 'Internal server error', error.message));
    }
});

// Apple App Store Server Notifications endpoint
app.post('/webhook/app-store-server-notifications', async (req, res) => {
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
            return res.status(400).json(createErrorResponse(400, 'Invalid JSON payload', parseError.message));
        }

        // App Store Server Notifications always have a signedPayload
        if (!notificationData.signedPayload) {
            console.error('Missing signedPayload in server notification');
            return res.status(400).json(createErrorResponse(400, 'Missing signedPayload'));
        }

        // Verify JWT signature
        let decodedPayload;
        try {
            console.log('Verifying JWT signature for server notification...');
            decodedPayload = await verifyAppleJWT(notificationData.signedPayload);
            console.log('JWT signature verified successfully');
        } catch (jwtError) {
            console.error('JWT signature verification failed:', jwtError.message);
            return res.status(401).json(createErrorResponse(401, 'Invalid JWT signature', jwtError.message));
        }
        
        // Process the server notification with decoded payload and metadata
        const metadata = {
            userAgent: req.headers['user-agent'],
            contentType: req.headers['content-type'],
            jwtVerified: true,
            signatureVerified: true
        };
        
        const result = await processServerNotification(notificationData, decodedPayload, metadata);

        res.status(200).json({ 
            status: 'success',
            message: 'Server notification processed successfully',
            timestamp: new Date().toISOString(),
            stored: result?.success || false
        });

    } catch (error) {
        console.error('Error processing server notification:', error);
        res.status(500).json(createErrorResponse(500, 'Internal server error', error.message));
    }
});

// Test notification endpoints
app.post('/test/request-notification', async (req, res) => {
    try {
        console.log('Requesting test notification from Apple...');
        
        const result = await requestTestNotification();
        
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
        res.status(500).json(createErrorResponse(500, 'Internal server error', error.message));
    }
});

app.get('/test/notification-status/:token', async (req, res) => {
    try {
        const testNotificationToken = req.params.token;
        
        if (!testNotificationToken) {
            return res.status(400).json(createErrorResponse(400, 'Missing test notification token'));
        }
        
        console.log('Checking test notification status:', testNotificationToken);
        
        const result = await getTestNotificationStatus(testNotificationToken);
        
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
        res.status(500).json(createErrorResponse(500, 'Internal server error', error.message));
    }
});

// Firestore Storage Functions with Retry Logic
async function storeWebhookEventInFirestore(event, eventType, metadata = {}, retryCount = 0) {
    if (!db) {
        console.log('Firestore not available, skipping storage');
        return { success: false, error: 'Firestore not available' };
    }

    const maxRetries = 3;
    const retryDelay = 1000 * Math.pow(2, retryCount); // Exponential backoff

    try {
        const eventDocument = {
            eventType: eventType,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            receivedAt: new Date().toISOString(),
            data: event,
            metadata: {
                userAgent: metadata.userAgent || null,
                contentType: metadata.contentType || null,
                hasSignature: metadata.hasSignature || false,
                signatureVerified: metadata.signatureVerified || false,
                retryCount: retryCount,
                ...metadata
            },
            processed: true,
            source: 'app-store-connect'
        };

        // Store in the webhook_events collection
        const docRef = await db.collection('webhook_events').add(eventDocument);
        console.log('Webhook event stored in Firestore:', docRef.id);
        
        // Store event type specific data if needed
        await storeEventTypeSpecificData(eventType, event, docRef.id);
        
        return { success: true, docId: docRef.id };
        
    } catch (error) {
        console.error(`Error storing webhook event in Firestore (attempt ${retryCount + 1}):`, error);
        
        // Check if this is a retryable error
        if (retryCount < maxRetries && isRetryableError(error)) {
            console.log(`Retrying in ${retryDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            return storeWebhookEventInFirestore(event, eventType, metadata, retryCount + 1);
        }
        
        // Log failed storage attempt for monitoring
        await logFailedStorage('webhook_event', { eventType, error: error.message, retryCount });
        
        return { success: false, error: error.message };
    }
}

async function storeServerNotificationInFirestore(notification, decodedPayload, metadata = {}, retryCount = 0) {
    if (!db) {
        console.log('Firestore not available, skipping storage');
        return { success: false, error: 'Firestore not available' };
    }

    const maxRetries = 3;
    const retryDelay = 1000 * Math.pow(2, retryCount); // Exponential backoff

    try {
        // Create document with only defined values
        const notificationDocument = {
            notificationType: decodedPayload?.notificationType,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            receivedAt: new Date().toISOString(),
            bundleId: decodedPayload?.data?.bundleId,
            environment: decodedPayload?.data?.environment,
            originalNotification: notification,
            decodedPayload: decodedPayload,
            metadata: {
                userAgent: metadata.userAgent || null,
                contentType: metadata.contentType || null,
                jwtVerified: metadata.jwtVerified || false,
                retryCount: retryCount,
                ...metadata
            },
            processed: true,
            source: 'app-store-server'
        };

        // Only add subtype if it's defined
        if (decodedPayload?.subtype !== undefined) {
            notificationDocument.subtype = decodedPayload.subtype;
        }

        // Store in the server_notifications collection
        const docRef = await db.collection('server_notifications').add(notificationDocument);
        console.log('Server notification stored in Firestore:', docRef.id);
        
        // Store purchase/subscription specific data
        await storePurchaseEventData(decodedPayload, docRef.id);
        
        return { success: true, docId: docRef.id };
        
    } catch (error) {
        console.error(`Error storing server notification in Firestore (attempt ${retryCount + 1}):`, error);
        
        // Check if this is a retryable error
        if (retryCount < maxRetries && isRetryableError(error)) {
            console.log(`Retrying in ${retryDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            return storeServerNotificationInFirestore(notification, decodedPayload, metadata, retryCount + 1);
        }
        
        // Log failed storage attempt for monitoring
        await logFailedStorage('server_notification', { 
            notificationType: decodedPayload?.notificationType, 
            error: error.message, 
            retryCount 
        });
        
        return { success: false, error: error.message };
    }
}

async function storeEventTypeSpecificData(eventType, event, parentDocId) {
    if (!db) return;

    try {
        switch (eventType) {
            case 'APP_STORE_VERSION_STATE_CHANGED':
                await db.collection('app_version_events').add({
                    parentDocId: parentDocId,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    appId: event.data?.attributes?.appId,
                    versionString: event.data?.attributes?.versionString,
                    platform: event.data?.attributes?.platform,
                    appStoreState: event.data?.attributes?.appStoreState,
                    previousState: event.data?.attributes?.previousAppStoreState,
                    eventData: event
                });
                break;
                
            case 'TESTFLIGHT_BETA_FEEDBACK_RECEIVED':
                await db.collection('testflight_feedback').add({
                    parentDocId: parentDocId,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    feedbackId: event.data?.id,
                    appId: event.data?.attributes?.appId,
                    betaGroupName: event.data?.attributes?.betaGroupName,
                    buildVersion: event.data?.attributes?.buildVersion,
                    rating: event.data?.attributes?.rating,
                    eventData: event
                });
                break;
        }
    } catch (error) {
        console.error('Error storing event-specific data:', error);
    }
}

async function storePurchaseEventData(decodedPayload, parentDocId) {
    if (!db) return;

    try {
        const transactionInfo = decodedPayload?.data?.latestReceiptInfo;
        if (transactionInfo) {
            const purchaseEventData = {
                parentDocId: parentDocId,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                transactionId: transactionInfo.transaction_id,
                originalTransactionId: transactionInfo.original_transaction_id,
                productId: transactionInfo.product_id,
                purchaseDate: transactionInfo.purchase_date_ms ? new Date(parseInt(transactionInfo.purchase_date_ms)) : null,
                expiresDate: transactionInfo.expires_date_ms ? new Date(parseInt(transactionInfo.expires_date_ms)) : null,
                isTrialPeriod: transactionInfo.is_trial_period,
                isInIntroOfferPeriod: transactionInfo.is_in_intro_offer_period,
                notificationType: decodedPayload.notificationType,
                environment: decodedPayload.data?.environment,
                bundleId: decodedPayload.data?.bundleId,
                eventData: decodedPayload
            };

            // Only add subtype if it's defined
            if (decodedPayload?.subtype !== undefined) {
                purchaseEventData.subtype = decodedPayload.subtype;
            }

            await db.collection('purchase_events').add(purchaseEventData);
        }
    } catch (error) {
        console.error('Error storing purchase event data:', error);
    }
}

// Error handling helper functions
function isRetryableError(error) {
    // Check for common retryable Firebase errors
    const retryableErrors = [
        'UNAVAILABLE',
        'DEADLINE_EXCEEDED',
        'RESOURCE_EXHAUSTED',
        'INTERNAL',
        'ABORTED'
    ];
    
    return retryableErrors.some(code => 
        error.code === code || 
        error.message.includes(code) ||
        error.message.includes('timeout') ||
        error.message.includes('network')
    );
}

async function logFailedStorage(type, details) {
    try {
        if (!db) return;
        
        await db.collection('failed_storage_attempts').add({
            type: type,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            details: details,
            environment: process.env.NODE_ENV || 'development'
        });
    } catch (error) {
        console.error('Error logging failed storage attempt:', error);
    }
}

// Enhanced error response helper
function createErrorResponse(statusCode, message, details = null) {
    const response = {
        error: message,
        timestamp: new Date().toISOString(),
        status: statusCode
    };
    
    if (details && process.env.NODE_ENV !== 'production') {
        response.details = details;
    }
    
    return response;
}

// Process different webhook event types
async function processWebhookEvent(event, eventType, metadata = {}) {
    console.log('Processing webhook event:', {
        eventType: eventType,
        timestamp: new Date().toISOString(),
        data: event
    });

    switch (eventType) {
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
        case 'webhookPingCreated':
            console.log('Webhook ping created (Apple test event):', event);
            break;
        default:
            console.log('Unknown event type:', eventType, event);
    }

    // Store event in Firestore
    return await storeWebhookEventInFirestore(event, eventType, metadata);
}

// Process App Store Server Notifications (in-app purchases)
async function processServerNotification(notification, decodedPayload, metadata = {}) {
    console.log('Processing server notification:', {
        timestamp: new Date().toISOString(),
        hasSignedPayload: !!notification.signedPayload,
        notificationType: decodedPayload?.notificationType,
        subtype: decodedPayload?.subtype
    });

    // Extract notification details from decoded JWT
    const notificationType = decodedPayload?.notificationType;
    const subtype = decodedPayload?.subtype;
    const data = decodedPayload?.data;

    console.log('Server notification details:', {
        notificationType,
        subtype,
        bundleId: data?.bundleId,
        environment: data?.environment
    });

    // Process different notification types
    switch (notificationType) {
        case 'SUBSCRIBED':
            console.log('New subscription:', {
                productId: data?.latestReceiptInfo?.product_id,
                transactionId: data?.latestReceiptInfo?.transaction_id
            });
            break;
        case 'DID_RENEW':
            console.log('Subscription renewed:', {
                productId: data?.latestReceiptInfo?.product_id,
                transactionId: data?.latestReceiptInfo?.transaction_id
            });
            break;
        case 'EXPIRED':
            console.log('Subscription expired:', {
                productId: data?.latestReceiptInfo?.product_id,
                expirationReason: subtype
            });
            break;
        case 'DID_CANCEL':
            console.log('Subscription cancelled:', {
                productId: data?.latestReceiptInfo?.product_id,
                cancellationReason: subtype
            });
            break;
        case 'REFUND':
            console.log('Purchase refunded:', {
                productId: data?.latestReceiptInfo?.product_id,
                transactionId: data?.latestReceiptInfo?.transaction_id
            });
            break;
        case 'PRICE_INCREASE':
            console.log('Price increase consent:', {
                productId: data?.latestReceiptInfo?.product_id,
                consentStatus: subtype
            });
            break;
        case 'GRACE_PERIOD_EXPIRED':
            console.log('Grace period expired:', {
                productId: data?.latestReceiptInfo?.product_id
            });
            break;
        case 'TEST':
            console.log('Test notification received');
            break;
        default:
            console.log('Unknown notification type:', notificationType, {
                subtype,
                data
            });
    }
    
    // Store server notification in Firestore
    return await storeServerNotificationInFirestore(notification, decodedPayload, metadata);
}

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json(createErrorResponse(500, 'Internal server error', error.message));
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json(createErrorResponse(404, 'Endpoint not found', `Path ${req.originalUrl} not found`));
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