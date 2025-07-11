const config = require('../config');

class StripeApiService {
    constructor() {
        this.stripe = null;
        this.initializeStripe();
    }

    /**
     * Initialize Stripe SDK
     */
    initializeStripe() {
        try {
            if (!config.stripe.secretKey) {
                console.log('Stripe secret key not configured, API service disabled');
                return;
            }

            // Dynamically import Stripe (if available)
            const Stripe = require('stripe');
            this.stripe = new Stripe(config.stripe.secretKey, config.getStripeConfig());
            
            console.log('Stripe API service initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Stripe API service:', error);
            this.stripe = null;
        }
    }

    /**
     * Check if Stripe API is available
     */
    isAvailable() {
        return this.stripe !== null;
    }

    /**
     * Retrieve a customer from Stripe
     */
    async retrieveCustomer(customerId) {
        if (!this.isAvailable()) {
            throw new Error('Stripe API service not available');
        }

        try {
            const customer = await this.stripe.customers.retrieve(customerId);
            return customer;
        } catch (error) {
            console.error(`Error retrieving customer ${customerId}:`, error);
            throw error;
        }
    }

    /**
     * Retrieve a payment intent from Stripe
     */
    async retrievePaymentIntent(paymentIntentId) {
        if (!this.isAvailable()) {
            throw new Error('Stripe API service not available');
        }

        try {
            const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
            return paymentIntent;
        } catch (error) {
            console.error(`Error retrieving payment intent ${paymentIntentId}:`, error);
            throw error;
        }
    }

    /**
     * Retrieve a subscription from Stripe
     */
    async retrieveSubscription(subscriptionId) {
        if (!this.isAvailable()) {
            throw new Error('Stripe API service not available');
        }

        try {
            const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
            return subscription;
        } catch (error) {
            console.error(`Error retrieving subscription ${subscriptionId}:`, error);
            throw error;
        }
    }

    /**
     * Retrieve an invoice from Stripe
     */
    async retrieveInvoice(invoiceId) {
        if (!this.isAvailable()) {
            throw new Error('Stripe API service not available');
        }

        try {
            const invoice = await this.stripe.invoices.retrieve(invoiceId);
            return invoice;
        } catch (error) {
            console.error(`Error retrieving invoice ${invoiceId}:`, error);
            throw error;
        }
    }

    /**
     * Retrieve a charge from Stripe
     */
    async retrieveCharge(chargeId) {
        if (!this.isAvailable()) {
            throw new Error('Stripe API service not available');
        }

        try {
            const charge = await this.stripe.charges.retrieve(chargeId);
            return charge;
        } catch (error) {
            console.error(`Error retrieving charge ${chargeId}:`, error);
            throw error;
        }
    }

    /**
     * List customer subscriptions
     */
    async listCustomerSubscriptions(customerId, options = {}) {
        if (!this.isAvailable()) {
            throw new Error('Stripe API service not available');
        }

        try {
            const subscriptions = await this.stripe.subscriptions.list({
                customer: customerId,
                ...options
            });
            return subscriptions;
        } catch (error) {
            console.error(`Error listing subscriptions for customer ${customerId}:`, error);
            throw error;
        }
    }

    /**
     * List customer payment methods
     */
    async listCustomerPaymentMethods(customerId, type = 'card') {
        if (!this.isAvailable()) {
            throw new Error('Stripe API service not available');
        }

        try {
            const paymentMethods = await this.stripe.paymentMethods.list({
                customer: customerId,
                type: type
            });
            return paymentMethods;
        } catch (error) {
            console.error(`Error listing payment methods for customer ${customerId}:`, error);
            throw error;
        }
    }

    /**
     * Create a test webhook event (for development/testing)
     */
    async createTestWebhookEvent(eventType, data) {
        if (!this.isAvailable()) {
            throw new Error('Stripe API service not available');
        }

        if (!config.isDevelopment()) {
            throw new Error('Test webhook events can only be created in development mode');
        }

        try {
            // This is a mock implementation - Stripe doesn't have a direct API for this
            // In real scenarios, you would use Stripe CLI or dashboard to trigger test events
            const testEvent = {
                id: `evt_test_${Date.now()}`,
                type: eventType,
                data: { object: data },
                created: Math.floor(Date.now() / 1000),
                livemode: false,
                api_version: config.stripe.apiVersion,
                pending_webhooks: 1
            };

            console.log(`Created test webhook event: ${eventType}`);
            return testEvent;
        } catch (error) {
            console.error(`Error creating test webhook event:`, error);
            throw error;
        }
    }

    /**
     * Validate webhook signature using Stripe SDK
     */
    validateWebhookSignature(payload, signature, secret = null) {
        if (!this.isAvailable()) {
            throw new Error('Stripe API service not available');
        }

        try {
            const webhookSecret = secret || config.stripe.webhookSecret;
            const event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
            return event;
        } catch (error) {
            console.error('Stripe webhook signature validation failed:', error);
            throw error;
        }
    }

    /**
     * Get account information
     */
    async getAccount() {
        if (!this.isAvailable()) {
            throw new Error('Stripe API service not available');
        }

        try {
            const account = await this.stripe.account.retrieve();
            return account;
        } catch (error) {
            console.error('Error retrieving account information:', error);
            throw error;
        }
    }

    /**
     * Health check for Stripe API connectivity
     */
    async healthCheck() {
        if (!this.isAvailable()) {
            return {
                status: 'unavailable',
                message: 'Stripe API service not initialized'
            };
        }

        try {
            // Try to retrieve account information as a connectivity test
            const account = await this.getAccount();
            return {
                status: 'healthy',
                accountId: account.id,
                country: account.country,
                currency: account.default_currency,
                livemode: !config.stripe.secretKey.includes('test')
            };
        } catch (error) {
            return {
                status: 'error',
                message: error.message,
                code: error.code
            };
        }
    }
}

module.exports = new StripeApiService(); 