const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const admin = require('firebase-admin');
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

// JWKS client for Apple's public keys
const client = jwksClient({
    jwksUri: 'https://www.apple.com/certificateauthority/Apple_App_Store_Connect_Signing_Key.jwks',
    cache: true,
    cacheMaxAge: 86400000, // 24 hours
    timeout: 30000
});

// Get Apple's signing key for JWT verification
function getAppleSigningKey(header, callback) {
    client.getSigningKey(header.kid, (err, key) => {
        if (err) {
            console.error('Error getting Apple signing key:', err);
            return callback(err);
        }
        const signingKey = key.publicKey || key.rsaPublicKey;
        callback(null, signingKey);
    });
}

// Verify Apple JWT signature
async function verifyAppleJWT(token) {
    return new Promise((resolve, reject) => {
        // First decode without verification to get the header
        const decoded = jwt.decode(token, { complete: true });
        if (!decoded) {
            return reject(new Error('Invalid JWT token'));
        }

        // Get the signing key and verify
        getAppleSigningKey(decoded.header, (err, key) => {
            if (err) {
                return reject(err);
            }

            try {
                const verified = jwt.verify(token, key, {
                    algorithms: ['ES256'],
                    issuer: 'https://appleid.apple.com'
                });
                resolve(verified);
            } catch (verifyErr) {
                reject(verifyErr);
            }
        });
    });
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
            serverNotifications: '/webhook/app-store-server-notifications'
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
            jwtVerified: true
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
        const notificationDocument = {
            notificationType: decodedPayload?.notificationType,
            subtype: decodedPayload?.subtype,
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
            await db.collection('purchase_events').add({
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
                subtype: decodedPayload.subtype,
                environment: decodedPayload.data?.environment,
                bundleId: decodedPayload.data?.bundleId,
                eventData: decodedPayload
            });
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