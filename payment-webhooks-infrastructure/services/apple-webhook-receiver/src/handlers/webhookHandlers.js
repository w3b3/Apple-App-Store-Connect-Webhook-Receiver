const firestoreService = require('../database/firestore');

class WebhookHandlers {
    /**
     * Process different webhook event types
     */
    async processWebhookEvent(event, eventType, metadata = {}) {
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
        return await firestoreService.storeWebhookEvent(event, eventType, metadata);
    }

    /**
     * Process App Store Server Notifications (in-app purchases)
     */
    async processServerNotification(notification, decodedPayload, metadata = {}) {
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
        return await firestoreService.storeServerNotification(notification, decodedPayload, metadata);
    }
}

module.exports = new WebhookHandlers(); 