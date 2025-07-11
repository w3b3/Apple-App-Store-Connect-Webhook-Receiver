const crypto = require('crypto');
const config = require('../config');

class StripeAuth {
    /**
     * Verify Stripe webhook signature
     * @param {Buffer} payload - Raw request payload
     * @param {string} signature - Stripe signature header
     * @param {string} secret - Webhook endpoint secret
     * @returns {boolean} - True if signature is valid
     */
    static verifyWebhookSignature(payload, signature, secret = null) {
        try {
            const webhookSecret = secret || config.stripe.webhookSecret;
            
            if (!webhookSecret) {
                console.error('Stripe webhook secret not configured');
                return false;
            }

            if (!signature) {
                console.error('No Stripe signature provided');
                return false;
            }

            // Parse the signature header
            const elements = signature.split(',');
            const signatureElements = {};
            
            for (const element of elements) {
                const [key, value] = element.split('=');
                signatureElements[key] = value;
            }

            const timestamp = signatureElements.t;
            const signatures = [
                signatureElements.v1,
                signatureElements.v0 // Fallback for older webhook versions
            ].filter(Boolean);

            if (!timestamp || signatures.length === 0) {
                console.error('Invalid Stripe signature format');
                return false;
            }

            // Check timestamp tolerance (5 minutes)
            const currentTime = Math.floor(Date.now() / 1000);
            const tolerance = 300; // 5 minutes in seconds
            
            if (Math.abs(currentTime - parseInt(timestamp)) > tolerance) {
                console.error('Stripe webhook timestamp outside tolerance');
                return false;
            }

            // Construct the signed payload
            const signedPayload = `${timestamp}.${payload}`;
            
            // Compute expected signature
            const expectedSignature = crypto
                .createHmac('sha256', webhookSecret)
                .update(signedPayload, 'utf8')
                .digest('hex');

            // Compare signatures using constant-time comparison
            const isValid = signatures.some(signature => 
                this.secureCompare(signature, expectedSignature)
            );

            if (!isValid) {
                console.error('Stripe webhook signature verification failed');
                return false;
            }

            console.log('Stripe webhook signature verified successfully');
            return true;

        } catch (error) {
            console.error('Error verifying Stripe webhook signature:', error);
            return false;
        }
    }

    /**
     * Secure string comparison to prevent timing attacks
     * @param {string} a - First string
     * @param {string} b - Second string
     * @returns {boolean} - True if strings are equal
     */
    static secureCompare(a, b) {
        if (a.length !== b.length) {
            return false;
        }
        
        let result = 0;
        for (let i = 0; i < a.length; i++) {
            result |= a.charCodeAt(i) ^ b.charCodeAt(i);
        }
        
        return result === 0;
    }

    /**
     * Extract and validate Stripe event from payload
     * @param {Buffer} payload - Raw request payload
     * @param {string} signature - Stripe signature header
     * @returns {Object|null} - Parsed Stripe event or null if invalid
     */
    static validateAndParseEvent(payload, signature) {
        try {
            // Verify signature first
            if (!this.verifyWebhookSignature(payload, signature)) {
                return null;
            }

            // Parse the JSON payload
            const event = JSON.parse(payload.toString());

            // Validate event structure
            if (!event.id || !event.type || !event.data) {
                console.error('Invalid Stripe event structure');
                return null;
            }

            // Check if event type is supported
            if (!config.isEventTypeSupported(event.type)) {
                console.log(`Unsupported Stripe event type: ${event.type}`);
                return null;
            }

            console.log(`Validated Stripe event: ${event.type} (${event.id})`);
            return event;

        } catch (error) {
            console.error('Error parsing Stripe event:', error);
            return null;
        }
    }

    /**
     * Middleware for Stripe webhook authentication
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next function
     */
    static webhookAuthMiddleware() {
        return (req, res, next) => {
            try {
                const signature = req.headers[config.constants.signatureHeader];
                const payload = req.body;

                if (!payload) {
                    console.error('No payload received');
                    return res.status(400).json({ error: 'No payload received' });
                }

                // Validate and parse the event
                const event = StripeAuth.validateAndParseEvent(payload, signature);
                
                if (!event) {
                    console.error('Invalid Stripe webhook event');
                    return res.status(400).json({ error: 'Invalid webhook event' });
                }

                // Attach the validated event to the request
                req.stripeEvent = event;
                req.stripeSignature = signature;
                req.signatureVerified = true;

                next();

            } catch (error) {
                console.error('Stripe webhook authentication error:', error);
                return res.status(500).json({ error: 'Authentication error' });
            }
        };
    }

    /**
     * Get authentication metadata for logging
     * @param {Object} req - Express request object
     * @returns {Object} - Authentication metadata
     */
    static getAuthMetadata(req) {
        return {
            hasSignature: !!req.headers[config.constants.signatureHeader],
            signatureVerified: req.signatureVerified || false,
            eventId: req.stripeEvent?.id || null,
            eventType: req.stripeEvent?.type || null,
            livemode: req.stripeEvent?.livemode || false,
            apiVersion: req.stripeEvent?.api_version || null,
            created: req.stripeEvent?.created || null
        };
    }

    /**
     * Validate Stripe API key format
     * @param {string} apiKey - Stripe API key
     * @returns {boolean} - True if format is valid
     */
    static validateApiKeyFormat(apiKey) {
        if (!apiKey || typeof apiKey !== 'string') {
            return false;
        }

        // Stripe API keys have specific prefixes
        const validPrefixes = ['sk_test_', 'sk_live_', 'pk_test_', 'pk_live_'];
        return validPrefixes.some(prefix => apiKey.startsWith(prefix));
    }

    /**
     * Check if API key is for live mode
     * @param {string} apiKey - Stripe API key
     * @returns {boolean} - True if live mode key
     */
    static isLiveMode(apiKey) {
        return apiKey && (apiKey.startsWith('sk_live_') || apiKey.startsWith('pk_live_'));
    }
}

module.exports = StripeAuth; 