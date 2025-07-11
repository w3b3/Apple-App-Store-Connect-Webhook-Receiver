const config = require('../config');
const StripeAuth = require('../auth');
const firestoreService = require('../database/firestore');
const Middleware = require('../middleware');

class StripeWebhookHandlers {
    /**
     * Main webhook handler that routes events to specific handlers
     */
    static async handleWebhook(req, res) {
        try {
            const event = req.stripeEvent;
            const metadata = {
                ...Middleware.extractRequestMetadata(req),
                ...StripeAuth.getAuthMetadata(req)
            };

            console.log(`Processing Stripe webhook: ${event.type} (${event.id})`);

            // Store the webhook event in Firestore
            const storageResult = await firestoreService.storeWebhookEvent(
                event,
                event.type,
                metadata
            );

            // Route to specific event handler
            let handlerResult;
            switch (event.type) {
                // Payment Intent Events
                case 'payment_intent.succeeded':
                    handlerResult = await this.handlePaymentIntentSucceeded(event, metadata);
                    break;
                case 'payment_intent.payment_failed':
                    handlerResult = await this.handlePaymentIntentFailed(event, metadata);
                    break;
                case 'payment_intent.canceled':
                    handlerResult = await this.handlePaymentIntentCanceled(event, metadata);
                    break;

                // Customer Events
                case 'customer.created':
                    handlerResult = await this.handleCustomerCreated(event, metadata);
                    break;
                case 'customer.updated':
                    handlerResult = await this.handleCustomerUpdated(event, metadata);
                    break;
                case 'customer.deleted':
                    handlerResult = await this.handleCustomerDeleted(event, metadata);
                    break;

                // Subscription Events
                case 'customer.subscription.created':
                    handlerResult = await this.handleSubscriptionCreated(event, metadata);
                    break;
                case 'customer.subscription.updated':
                    handlerResult = await this.handleSubscriptionUpdated(event, metadata);
                    break;
                case 'customer.subscription.deleted':
                    handlerResult = await this.handleSubscriptionDeleted(event, metadata);
                    break;

                // Invoice Events
                case 'invoice.payment_succeeded':
                    handlerResult = await this.handleInvoicePaymentSucceeded(event, metadata);
                    break;
                case 'invoice.payment_failed':
                    handlerResult = await this.handleInvoicePaymentFailed(event, metadata);
                    break;

                // Charge Events
                case 'charge.succeeded':
                    handlerResult = await this.handleChargeSucceeded(event, metadata);
                    break;
                case 'charge.failed':
                    handlerResult = await this.handleChargeFailed(event, metadata);
                    break;

                // Dispute Events
                case 'charge.dispute.created':
                    handlerResult = await this.handleDisputeCreated(event, metadata);
                    break;

                // Payment Method Events
                case 'payment_method.attached':
                    handlerResult = await this.handlePaymentMethodAttached(event, metadata);
                    break;

                default:
                    console.log(`No specific handler for event type: ${event.type}`);
                    handlerResult = { success: true, message: 'Event received but not processed' };
            }

            // Log the processing result
            console.log(`Stripe webhook processed: ${event.type} - ${handlerResult.success ? 'Success' : 'Failed'}`);

            res.status(200).json({
                received: true,
                eventId: event.id,
                eventType: event.type,
                processed: handlerResult.success,
                firestoreStored: storageResult.success
            });

        } catch (error) {
            console.error('Error processing Stripe webhook:', error);
            res.status(500).json({
                error: 'Webhook processing failed',
                message: error.message
            });
        }
    }

    /**
     * Handle successful payment intent
     */
    static async handlePaymentIntentSucceeded(event, metadata) {
        try {
            const paymentIntent = event.data.object;
            
            console.log(`Payment succeeded: ${paymentIntent.id} - Amount: ${paymentIntent.amount} ${paymentIntent.currency}`);

            // Store payment-specific data
            await firestoreService.storePaymentEvent(paymentIntent, 'payment_succeeded', metadata);

            // Add your business logic here
            // - Update order status
            // - Send confirmation emails
            // - Update inventory
            // - Trigger fulfillment

            return { success: true, message: 'Payment intent succeeded processed' };
        } catch (error) {
            console.error('Error handling payment intent succeeded:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Handle failed payment intent
     */
    static async handlePaymentIntentFailed(event, metadata) {
        try {
            const paymentIntent = event.data.object;
            
            console.log(`Payment failed: ${paymentIntent.id} - Reason: ${paymentIntent.last_payment_error?.message}`);

            // Store payment failure data
            await firestoreService.storePaymentEvent(paymentIntent, 'payment_failed', metadata);

            // Add your business logic here
            // - Update order status to failed
            // - Send failure notification
            // - Log for retry attempts

            return { success: true, message: 'Payment intent failed processed' };
        } catch (error) {
            console.error('Error handling payment intent failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Handle canceled payment intent
     */
    static async handlePaymentIntentCanceled(event, metadata) {
        try {
            const paymentIntent = event.data.object;
            
            console.log(`Payment canceled: ${paymentIntent.id}`);

            // Store cancellation data
            await firestoreService.storePaymentEvent(paymentIntent, 'payment_canceled', metadata);

            return { success: true, message: 'Payment intent canceled processed' };
        } catch (error) {
            console.error('Error handling payment intent canceled:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Handle customer creation
     */
    static async handleCustomerCreated(event, metadata) {
        try {
            const customer = event.data.object;
            
            console.log(`Customer created: ${customer.id} - Email: ${customer.email}`);

            // Store customer data
            await firestoreService.storeCustomerEvent(customer, 'customer_created', metadata);

            return { success: true, message: 'Customer created processed' };
        } catch (error) {
            console.error('Error handling customer created:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Handle customer updates
     */
    static async handleCustomerUpdated(event, metadata) {
        try {
            const customer = event.data.object;
            
            console.log(`Customer updated: ${customer.id}`);

            // Store customer update data
            await firestoreService.storeCustomerEvent(customer, 'customer_updated', metadata);

            return { success: true, message: 'Customer updated processed' };
        } catch (error) {
            console.error('Error handling customer updated:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Handle customer deletion
     */
    static async handleCustomerDeleted(event, metadata) {
        try {
            const customer = event.data.object;
            
            console.log(`Customer deleted: ${customer.id}`);

            // Store customer deletion data
            await firestoreService.storeCustomerEvent(customer, 'customer_deleted', metadata);

            return { success: true, message: 'Customer deleted processed' };
        } catch (error) {
            console.error('Error handling customer deleted:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Handle subscription creation
     */
    static async handleSubscriptionCreated(event, metadata) {
        try {
            const subscription = event.data.object;
            
            console.log(`Subscription created: ${subscription.id} - Customer: ${subscription.customer}`);

            // Store subscription data
            await firestoreService.storeSubscriptionEvent(subscription, 'subscription_created', metadata);

            return { success: true, message: 'Subscription created processed' };
        } catch (error) {
            console.error('Error handling subscription created:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Handle subscription updates
     */
    static async handleSubscriptionUpdated(event, metadata) {
        try {
            const subscription = event.data.object;
            
            console.log(`Subscription updated: ${subscription.id} - Status: ${subscription.status}`);

            // Store subscription update data
            await firestoreService.storeSubscriptionEvent(subscription, 'subscription_updated', metadata);

            return { success: true, message: 'Subscription updated processed' };
        } catch (error) {
            console.error('Error handling subscription updated:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Handle subscription deletion
     */
    static async handleSubscriptionDeleted(event, metadata) {
        try {
            const subscription = event.data.object;
            
            console.log(`Subscription deleted: ${subscription.id}`);

            // Store subscription deletion data
            await firestoreService.storeSubscriptionEvent(subscription, 'subscription_deleted', metadata);

            return { success: true, message: 'Subscription deleted processed' };
        } catch (error) {
            console.error('Error handling subscription deleted:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Handle successful invoice payment
     */
    static async handleInvoicePaymentSucceeded(event, metadata) {
        try {
            const invoice = event.data.object;
            
            console.log(`Invoice payment succeeded: ${invoice.id} - Amount: ${invoice.amount_paid}`);

            // Store invoice payment data
            await firestoreService.storeInvoiceEvent(invoice, 'invoice_payment_succeeded', metadata);

            return { success: true, message: 'Invoice payment succeeded processed' };
        } catch (error) {
            console.error('Error handling invoice payment succeeded:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Handle failed invoice payment
     */
    static async handleInvoicePaymentFailed(event, metadata) {
        try {
            const invoice = event.data.object;
            
            console.log(`Invoice payment failed: ${invoice.id}`);

            // Store invoice payment failure data
            await firestoreService.storeInvoiceEvent(invoice, 'invoice_payment_failed', metadata);

            return { success: true, message: 'Invoice payment failed processed' };
        } catch (error) {
            console.error('Error handling invoice payment failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Handle successful charge
     */
    static async handleChargeSucceeded(event, metadata) {
        try {
            const charge = event.data.object;
            
            console.log(`Charge succeeded: ${charge.id} - Amount: ${charge.amount} ${charge.currency}`);

            // Store charge data
            await firestoreService.storeChargeEvent(charge, 'charge_succeeded', metadata);

            return { success: true, message: 'Charge succeeded processed' };
        } catch (error) {
            console.error('Error handling charge succeeded:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Handle failed charge
     */
    static async handleChargeFailed(event, metadata) {
        try {
            const charge = event.data.object;
            
            console.log(`Charge failed: ${charge.id} - Reason: ${charge.failure_message}`);

            // Store charge failure data
            await firestoreService.storeChargeEvent(charge, 'charge_failed', metadata);

            return { success: true, message: 'Charge failed processed' };
        } catch (error) {
            console.error('Error handling charge failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Handle dispute creation
     */
    static async handleDisputeCreated(event, metadata) {
        try {
            const dispute = event.data.object;
            
            console.log(`Dispute created: ${dispute.id} - Charge: ${dispute.charge} - Reason: ${dispute.reason}`);

            // Store dispute data
            await firestoreService.storeDisputeEvent(dispute, 'dispute_created', metadata);

            return { success: true, message: 'Dispute created processed' };
        } catch (error) {
            console.error('Error handling dispute created:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Handle payment method attachment
     */
    static async handlePaymentMethodAttached(event, metadata) {
        try {
            const paymentMethod = event.data.object;
            
            console.log(`Payment method attached: ${paymentMethod.id} - Customer: ${paymentMethod.customer}`);

            // Store payment method data
            await firestoreService.storePaymentMethodEvent(paymentMethod, 'payment_method_attached', metadata);

            return { success: true, message: 'Payment method attached processed' };
        } catch (error) {
            console.error('Error handling payment method attached:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = StripeWebhookHandlers; 