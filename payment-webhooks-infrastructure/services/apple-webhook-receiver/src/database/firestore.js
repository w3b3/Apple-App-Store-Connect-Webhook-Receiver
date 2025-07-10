const admin = require('firebase-admin');
const config = require('../config');
const BaseFirestoreService = require('../../../shared-infrastructure/firestore/FirestoreService');

class AppleFirestoreService extends BaseFirestoreService {
    constructor() {
        super('apple-app-store', config);
    }

    /**
     * Store server notification in Firestore with retry logic
     */
    async storeServerNotification(notification, decodedPayload, metadata = {}, retryCount = 0) {
        return await this.storeProviderNotification(notification, decodedPayload, metadata, retryCount);
    }

    // Inherited from BaseFirestoreService

    // Inherited from BaseFirestoreService

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

module.exports = new AppleFirestoreService(); 