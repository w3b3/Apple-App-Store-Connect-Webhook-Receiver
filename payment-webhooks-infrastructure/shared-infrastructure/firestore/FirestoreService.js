const admin = require('firebase-admin');

class FirestoreService {
    constructor(providerName = 'generic', config = null) {
        this.db = null;
        this.initialized = false;
        this.providerName = providerName;
        this.config = config;
        this.initializeFirestore();
    }

    /**
     * Initialize Firebase Admin SDK if Firestore is enabled
     */
    initializeFirestore() {
        if (!this.config || !this.config.firebase.enabled) {
            console.log('Firestore integration disabled');
            return;
        }

        try {
            // Initialize Firebase Admin SDK
            if (!admin.apps.length) {
                admin.initializeApp({
                    credential: admin.credential.applicationDefault(),
                    projectId: this.config.firebase.projectId
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
        return this.config && this.config.constants.retryableErrors.some(code => 
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
                provider: this.providerName,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                details: details,
                environment: this.config ? this.config.nodeEnv : 'unknown'
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
                source: this.providerName,
                provider: this.providerName
            };

            // Store in the webhook_events collection
            const docRef = await this.db.collection('webhook_events').add(eventDocument);
            console.log(`${this.providerName} webhook event stored in Firestore:`, docRef.id);
            
            // Store event type specific data if needed
            await this.storeEventTypeSpecificData(eventType, event, docRef.id);
            
            return { success: true, docId: docRef.id };
            
        } catch (error) {
            console.error(`Error storing ${this.providerName} webhook event in Firestore (attempt ${retryCount + 1}):`, error);
            
            // Check if this is a retryable error
            if (retryCount < (this.config ? this.config.constants.maxRetries : 3) && this.isRetryableError(error)) {
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
     * Store provider-specific notification in Firestore with retry logic
     */
    async storeProviderNotification(notification, decodedPayload, metadata = {}, retryCount = 0) {
        if (!this.isAvailable()) {
            console.log('Firestore not available, skipping storage');
            return { success: false, error: 'Firestore not available' };
        }

        const retryDelay = 1000 * Math.pow(2, retryCount); // Exponential backoff

        try {
            // Create document with only defined values
            const notificationDocument = {
                notificationType: decodedPayload?.notificationType || decodedPayload?.type,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                receivedAt: new Date().toISOString(),
                originalNotification: notification,
                decodedPayload: decodedPayload,
                metadata: {
                    userAgent: metadata.userAgent || null,
                    contentType: metadata.contentType || null,
                    signatureVerified: metadata.signatureVerified || false,
                    retryCount: retryCount,
                    ...metadata
                },
                processed: true,
                source: this.providerName,
                provider: this.providerName
            };

            // Add provider-specific fields
            if (decodedPayload?.subtype !== undefined) {
                notificationDocument.subtype = decodedPayload.subtype;
            }

            // Store in the provider_notifications collection
            const docRef = await this.db.collection(`${this.providerName}_notifications`).add(notificationDocument);
            console.log(`${this.providerName} notification stored in Firestore:`, docRef.id);
            
            // Store provider-specific data
            await this.storeProviderSpecificData(decodedPayload, docRef.id);
            
            return { success: true, docId: docRef.id };
            
        } catch (error) {
            console.error(`Error storing ${this.providerName} notification in Firestore (attempt ${retryCount + 1}):`, error);
            
            // Check if this is a retryable error
            if (retryCount < (this.config ? this.config.constants.maxRetries : 3) && this.isRetryableError(error)) {
                console.log(`Retrying in ${retryDelay}ms...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                return this.storeProviderNotification(notification, decodedPayload, metadata, retryCount + 1);
            }
            
            // Log failed storage attempt for monitoring
            await this.logFailedStorage('provider_notification', { 
                notificationType: decodedPayload?.notificationType || decodedPayload?.type, 
                error: error.message, 
                retryCount 
            });
            
            return { success: false, error: error.message };
        }
    }

    /**
     * Store event type specific data - to be overridden by provider-specific implementations
     */
    async storeEventTypeSpecificData(eventType, event, parentDocId) {
        // This method should be overridden by provider-specific implementations
        console.log(`Provider-specific event storage not implemented for ${this.providerName}`);
    }

    /**
     * Store provider-specific data - to be overridden by provider-specific implementations
     */
    async storeProviderSpecificData(decodedPayload, parentDocId) {
        // This method should be overridden by provider-specific implementations
        console.log(`Provider-specific data storage not implemented for ${this.providerName}`);
    }

    /**
     * Generic method to store any data in a specified collection
     */
    async storeData(collectionName, data, retryCount = 0) {
        if (!this.isAvailable()) {
            console.log('Firestore not available, skipping storage');
            return { success: false, error: 'Firestore not available' };
        }

        const retryDelay = 1000 * Math.pow(2, retryCount);

        try {
            const document = {
                ...data,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                provider: this.providerName,
                environment: this.config ? this.config.nodeEnv : 'unknown'
            };

            const docRef = await this.db.collection(collectionName).add(document);
            console.log(`Data stored in ${collectionName}:`, docRef.id);
            
            return { success: true, docId: docRef.id };
            
        } catch (error) {
            console.error(`Error storing data in ${collectionName} (attempt ${retryCount + 1}):`, error);
            
            if (retryCount < (this.config ? this.config.constants.maxRetries : 3) && this.isRetryableError(error)) {
                console.log(`Retrying in ${retryDelay}ms...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                return this.storeData(collectionName, data, retryCount + 1);
            }
            
            await this.logFailedStorage(collectionName, { error: error.message, retryCount });
            
            return { success: false, error: error.message };
        }
    }
}

module.exports = FirestoreService; 