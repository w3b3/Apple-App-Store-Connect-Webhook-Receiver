const admin = require('firebase-admin');
const config = require('../config');

class FirestoreService {
    constructor() {
        this.db = null;
        this.initialized = false;
        this.initializeFirestore();
    }

    /**
     * Initialize Firebase Admin SDK if Firestore is enabled
     */
    initializeFirestore() {
        if (!config.firebase.enabled) {
            console.log('Firestore integration disabled');
            return;
        }

        try {
            // Initialize Firebase Admin SDK
            if (!admin.apps.length) {
                admin.initializeApp({
                    credential: admin.credential.applicationDefault(),
                    projectId: config.firebase.projectId
                });
            }
            
            // Get Firestore database instance
            this.db = admin.firestore();
            console.log('Firestore initialized successfully');
            
            // Configure Firestore settings
            this.db.settings({
                timestampsInSnapshots: true
            });
            
            this.initialized = true;
            
        } catch (error) {
            console.error('Failed to initialize Firestore:', error);
            console.log('Continuing without Firestore integration');
            this.initialized = false;
        }
    }

    /**
     * Check if Firestore is available
     */
    isAvailable() {
        return this.initialized && this.db !== null;
    }

    /**
     * Check if error is retryable
     */
    isRetryableError(error) {
        return config.constants.retryableErrors.some(code => 
            error.code === code || 
            error.message.includes(code) ||
            error.message.includes('timeout') ||
            error.message.includes('network')
        );
    }

    /**
     * Log failed storage attempt for monitoring
     */
    async logFailedStorage(type, details) {
        try {
            if (!this.isAvailable()) return;
            
            await this.db.collection('failed_storage_attempts').add({
                type: type,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                details: details,
                environment: config.nodeEnv
            });
        } catch (error) {
            console.error('Error logging failed storage attempt:', error);
        }
    }

    /**
     * Store webhook event in Firestore with retry logic
     */
    async storeWebhookEvent(event, eventType, metadata = {}, retryCount = 0) {
        if (!this.isAvailable()) {
            console.log('Firestore not available, skipping storage');
            return { success: false, error: 'Firestore not available' };
        }

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
            const docRef = await this.db.collection('webhook_events').add(eventDocument);
            console.log('Webhook event stored in Firestore:', docRef.id);
            
            // Store event type specific data if needed
            await this.storeEventTypeSpecificData(eventType, event, docRef.id);
            
            return { success: true, docId: docRef.id };
            
        } catch (error) {
            console.error(`Error storing webhook event in Firestore (attempt ${retryCount + 1}):`, error);
            
            // Check if this is a retryable error
            if (retryCount < config.constants.maxRetries && this.isRetryableError(error)) {
                console.log(`Retrying in ${retryDelay}ms...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                return this.storeWebhookEvent(event, eventType, metadata, retryCount + 1);
            }
            
            // Log failed storage attempt for monitoring
            await this.logFailedStorage('webhook_event', { eventType, error: error.message, retryCount });
            
            return { success: false, error: error.message };
        }
    }

    /**
     * Store server notification in Firestore with retry logic
     */
    async storeServerNotification(notification, decodedPayload, metadata = {}, retryCount = 0) {
        if (!this.isAvailable()) {
            console.log('Firestore not available, skipping storage');
            return { success: false, error: 'Firestore not available' };
        }

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
            const docRef = await this.db.collection('server_notifications').add(notificationDocument);
            console.log('Server notification stored in Firestore:', docRef.id);
            
            // Store purchase/subscription specific data
            await this.storePurchaseEventData(decodedPayload, docRef.id);
            
            return { success: true, docId: docRef.id };
            
        } catch (error) {
            console.error(`Error storing server notification in Firestore (attempt ${retryCount + 1}):`, error);
            
            // Check if this is a retryable error
            if (retryCount < config.constants.maxRetries && this.isRetryableError(error)) {
                console.log(`Retrying in ${retryDelay}ms...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                return this.storeServerNotification(notification, decodedPayload, metadata, retryCount + 1);
            }
            
            // Log failed storage attempt for monitoring
            await this.logFailedStorage('server_notification', { 
                notificationType: decodedPayload?.notificationType, 
                error: error.message, 
                retryCount 
            });
            
            return { success: false, error: error.message };
        }
    }

    /**
     * Store event type specific data
     */
    async storeEventTypeSpecificData(eventType, event, parentDocId) {
        if (!this.isAvailable()) return;

        try {
            switch (eventType) {
                case 'APP_STORE_VERSION_STATE_CHANGED':
                    await this.db.collection('app_version_events').add({
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
                    await this.db.collection('testflight_feedback').add({
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

    /**
     * Store purchase event data
     */
    async storePurchaseEventData(decodedPayload, parentDocId) {
        if (!this.isAvailable()) return;

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

                await this.db.collection('purchase_events').add(purchaseEventData);
            }
        } catch (error) {
            console.error('Error storing purchase event data:', error);
        }
    }
}

module.exports = new FirestoreService(); 