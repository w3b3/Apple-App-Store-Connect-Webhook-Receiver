const admin = require('firebase-admin');
const config = require('../config');
const BaseFirestoreService = require('../../../shared-infrastructure/firestore/FirestoreService');

class StripeFirestoreService extends BaseFirestoreService {
    constructor() {
        super('stripe', config);
    }

    /**
     * Store Stripe-specific event data - override from base class
     */
    async storeEventTypeSpecificData(eventType, event, parentDocId) {
        if (!this.isAvailable()) return;

        try {
            const eventData = event.data.object;
            
            switch (eventType) {
                case 'payment_intent.succeeded':
                case 'payment_intent.payment_failed':
                case 'payment_intent.canceled':
                    await this.storePaymentIntentData(eventData, eventType, parentDocId);
                    break;
                    
                case 'customer.created':
                case 'customer.updated':
                case 'customer.deleted':
                    await this.storeCustomerData(eventData, eventType, parentDocId);
                    break;
                    
                case 'customer.subscription.created':
                case 'customer.subscription.updated':
                case 'customer.subscription.deleted':
                    await this.storeSubscriptionData(eventData, eventType, parentDocId);
                    break;
                    
                case 'invoice.payment_succeeded':
                case 'invoice.payment_failed':
                    await this.storeInvoiceData(eventData, eventType, parentDocId);
                    break;
                    
                case 'charge.succeeded':
                case 'charge.failed':
                    await this.storeChargeData(eventData, eventType, parentDocId);
                    break;
                    
                case 'charge.dispute.created':
                    await this.storeDisputeData(eventData, eventType, parentDocId);
                    break;
                    
                case 'payment_method.attached':
                    await this.storePaymentMethodData(eventData, eventType, parentDocId);
                    break;
            }
        } catch (error) {
            console.error('Error storing Stripe event-specific data:', error);
        }
    }

    /**
     * Store payment intent data
     */
    async storePaymentIntentData(paymentIntent, eventType, parentDocId) {
        try {
            const paymentData = {
                parentDocId: parentDocId,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                paymentIntentId: paymentIntent.id,
                amount: paymentIntent.amount,
                currency: paymentIntent.currency,
                status: paymentIntent.status,
                customerId: paymentIntent.customer,
                paymentMethodId: paymentIntent.payment_method,
                description: paymentIntent.description,
                receiptEmail: paymentIntent.receipt_email,
                created: new Date(paymentIntent.created * 1000),
                livemode: paymentIntent.livemode,
                eventType: eventType,
                lastPaymentError: paymentIntent.last_payment_error,
                metadata: paymentIntent.metadata || {},
                charges: paymentIntent.charges?.data || [],
                eventData: paymentIntent
            };

            await this.db.collection('stripe_payment_intents').add(paymentData);
            console.log(`Stored payment intent data: ${paymentIntent.id}`);
        } catch (error) {
            console.error('Error storing payment intent data:', error);
        }
    }

    /**
     * Store customer data
     */
    async storeCustomerData(customer, eventType, parentDocId) {
        try {
            const customerData = {
                parentDocId: parentDocId,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                customerId: customer.id,
                email: customer.email,
                name: customer.name,
                phone: customer.phone,
                description: customer.description,
                created: new Date(customer.created * 1000),
                livemode: customer.livemode,
                eventType: eventType,
                defaultSource: customer.default_source,
                subscriptions: customer.subscriptions?.data || [],
                metadata: customer.metadata || {},
                address: customer.address,
                shipping: customer.shipping,
                eventData: customer
            };

            await this.db.collection('stripe_customers').add(customerData);
            console.log(`Stored customer data: ${customer.id}`);
        } catch (error) {
            console.error('Error storing customer data:', error);
        }
    }

    /**
     * Store subscription data
     */
    async storeSubscriptionData(subscription, eventType, parentDocId) {
        try {
            const subscriptionData = {
                parentDocId: parentDocId,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                subscriptionId: subscription.id,
                customerId: subscription.customer,
                status: subscription.status,
                currentPeriodStart: new Date(subscription.current_period_start * 1000),
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                created: new Date(subscription.created * 1000),
                canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
                cancelAtPeriodEnd: subscription.cancel_at_period_end,
                livemode: subscription.livemode,
                eventType: eventType,
                items: subscription.items?.data || [],
                metadata: subscription.metadata || {},
                defaultPaymentMethod: subscription.default_payment_method,
                latestInvoice: subscription.latest_invoice,
                eventData: subscription
            };

            await this.db.collection('stripe_subscriptions').add(subscriptionData);
            console.log(`Stored subscription data: ${subscription.id}`);
        } catch (error) {
            console.error('Error storing subscription data:', error);
        }
    }

    /**
     * Store invoice data
     */
    async storeInvoiceData(invoice, eventType, parentDocId) {
        try {
            const invoiceData = {
                parentDocId: parentDocId,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                invoiceId: invoice.id,
                customerId: invoice.customer,
                subscriptionId: invoice.subscription,
                status: invoice.status,
                amountDue: invoice.amount_due,
                amountPaid: invoice.amount_paid,
                amountRemaining: invoice.amount_remaining,
                currency: invoice.currency,
                created: new Date(invoice.created * 1000),
                dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : null,
                paidAt: invoice.status_transitions?.paid_at ? new Date(invoice.status_transitions.paid_at * 1000) : null,
                livemode: invoice.livemode,
                eventType: eventType,
                hostedInvoiceUrl: invoice.hosted_invoice_url,
                invoicePdf: invoice.invoice_pdf,
                paymentIntent: invoice.payment_intent,
                charge: invoice.charge,
                metadata: invoice.metadata || {},
                lines: invoice.lines?.data || [],
                eventData: invoice
            };

            await this.db.collection('stripe_invoices').add(invoiceData);
            console.log(`Stored invoice data: ${invoice.id}`);
        } catch (error) {
            console.error('Error storing invoice data:', error);
        }
    }

    /**
     * Store charge data
     */
    async storeChargeData(charge, eventType, parentDocId) {
        try {
            const chargeData = {
                parentDocId: parentDocId,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                chargeId: charge.id,
                amount: charge.amount,
                currency: charge.currency,
                status: charge.status,
                customerId: charge.customer,
                paymentIntentId: charge.payment_intent,
                paymentMethodId: charge.payment_method,
                description: charge.description,
                receiptEmail: charge.receipt_email,
                receiptUrl: charge.receipt_url,
                created: new Date(charge.created * 1000),
                livemode: charge.livemode,
                eventType: eventType,
                paid: charge.paid,
                refunded: charge.refunded,
                captured: charge.captured,
                failureCode: charge.failure_code,
                failureMessage: charge.failure_message,
                metadata: charge.metadata || {},
                billingDetails: charge.billing_details,
                outcome: charge.outcome,
                eventData: charge
            };

            await this.db.collection('stripe_charges').add(chargeData);
            console.log(`Stored charge data: ${charge.id}`);
        } catch (error) {
            console.error('Error storing charge data:', error);
        }
    }

    /**
     * Store dispute data
     */
    async storeDisputeData(dispute, eventType, parentDocId) {
        try {
            const disputeData = {
                parentDocId: parentDocId,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                disputeId: dispute.id,
                chargeId: dispute.charge,
                amount: dispute.amount,
                currency: dispute.currency,
                reason: dispute.reason,
                status: dispute.status,
                created: new Date(dispute.created * 1000),
                livemode: dispute.livemode,
                eventType: eventType,
                evidence: dispute.evidence,
                evidenceDetails: dispute.evidence_details,
                metadata: dispute.metadata || {},
                networkReasonCode: dispute.network_reason_code,
                eventData: dispute
            };

            await this.db.collection('stripe_disputes').add(disputeData);
            console.log(`Stored dispute data: ${dispute.id}`);
        } catch (error) {
            console.error('Error storing dispute data:', error);
        }
    }

    /**
     * Store payment method data
     */
    async storePaymentMethodData(paymentMethod, eventType, parentDocId) {
        try {
            const paymentMethodData = {
                parentDocId: parentDocId,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                paymentMethodId: paymentMethod.id,
                customerId: paymentMethod.customer,
                type: paymentMethod.type,
                created: new Date(paymentMethod.created * 1000),
                livemode: paymentMethod.livemode,
                eventType: eventType,
                billingDetails: paymentMethod.billing_details,
                card: paymentMethod.card,
                metadata: paymentMethod.metadata || {},
                eventData: paymentMethod
            };

            await this.db.collection('stripe_payment_methods').add(paymentMethodData);
            console.log(`Stored payment method data: ${paymentMethod.id}`);
        } catch (error) {
            console.error('Error storing payment method data:', error);
        }
    }

    /**
     * Store payment event (legacy method for backward compatibility)
     */
    async storePaymentEvent(paymentIntent, eventType, metadata) {
        return await this.storePaymentIntentData(paymentIntent, eventType, null);
    }

    /**
     * Store customer event (legacy method for backward compatibility)
     */
    async storeCustomerEvent(customer, eventType, metadata) {
        return await this.storeCustomerData(customer, eventType, null);
    }

    /**
     * Store subscription event (legacy method for backward compatibility)
     */
    async storeSubscriptionEvent(subscription, eventType, metadata) {
        return await this.storeSubscriptionData(subscription, eventType, null);
    }

    /**
     * Store invoice event (legacy method for backward compatibility)
     */
    async storeInvoiceEvent(invoice, eventType, metadata) {
        return await this.storeInvoiceData(invoice, eventType, null);
    }

    /**
     * Store charge event (legacy method for backward compatibility)
     */
    async storeChargeEvent(charge, eventType, metadata) {
        return await this.storeChargeData(charge, eventType, null);
    }

    /**
     * Store dispute event (legacy method for backward compatibility)
     */
    async storeDisputeEvent(dispute, eventType, metadata) {
        return await this.storeDisputeData(dispute, eventType, null);
    }

    /**
     * Store payment method event (legacy method for backward compatibility)
     */
    async storePaymentMethodEvent(paymentMethod, eventType, metadata) {
        return await this.storePaymentMethodData(paymentMethod, eventType, null);
    }
}

module.exports = new StripeFirestoreService(); 