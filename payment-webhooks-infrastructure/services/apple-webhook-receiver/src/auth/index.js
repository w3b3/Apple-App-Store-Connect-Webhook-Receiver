const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const jose = require('node-jose');
const fs = require('fs');
const config = require('../config');

class AuthService {
    /**
     * Validate certificate chain (basic validation)
     * In production, you'd want more thorough validation
     */
    validateCertificateChain(x5cChain) {
        if (!x5cChain || !Array.isArray(x5cChain) || x5cChain.length === 0) {
            throw new Error('Invalid x5c certificate chain');
        }
        
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

    /**
     * Verify Apple JWT signature using x5c certificate chain
     */
    async verifyAppleJWT(token) {
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
            this.validateCertificateChain(x5cChain);

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

    /**
     * Create JWT for App Store Server API authentication
     */
    createAppStoreServerAPIJWT() {
        const { keyId, issuerId, privateKeyPath } = config.appStore.serverApi;
        const bundleId = config.appStore.bundleId;

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
                exp: now + config.constants.jwtExpiration,
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

    /**
     * Verify webhook signature using HMAC-SHA256
     */
    verifyWebhookSignature(payload, signature, secret) {
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
}

module.exports = new AuthService(); 