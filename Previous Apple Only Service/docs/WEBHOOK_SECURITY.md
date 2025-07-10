# Apple App Store Connect Webhook Security

## How Webhook Signature Verification Works

### Overview
Apple App Store Connect uses **HMAC-SHA256** signature verification to ensure webhook authenticity. This prevents malicious actors from sending fake webhook requests to your server.

### The Process

1. **Shared Secret**: You create a secret string that both Apple and your server know
2. **Apple Signs**: Apple creates an HMAC-SHA256 signature using your webhook payload + secret
3. **Apple Sends**: Apple sends the webhook with the signature in the `X-App-Store-Signature` header
4. **Your Server Verifies**: Your server recreates the signature and compares it

### Step-by-Step Setup

#### 1. Generate a Strong Secret
```bash
# Generate a secure random secret (32 characters)
openssl rand -hex 32
# Example output: a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
```

#### 2. Configure in App Store Connect
When creating your webhook in App Store Connect:
- **Name**: Your webhook name
- **Payload URL**: `https://your-domain.com/webhook/app-store-connect`
- **Secret**: The secret you generated above
- **App**: Select your app
- **Event Types**: Choose the events you want to receive

#### 3. Configure in Your Server
Add the same secret to your server's environment:
```bash
# Edit your .env file
sudo nano /opt/webhook-receiver/.env

# Add the secret
APP_STORE_WEBHOOK_SECRET=a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
```

#### 4. Restart Your Service
```bash
sudo systemctl restart webhook-receiver
```

### How the Verification Works (Technical Details)

#### Apple's Side (Sending)
```javascript
// Apple creates the signature like this:
const signature = crypto
    .createHmac('sha256', your_secret)
    .update(webhook_payload_as_string, 'utf8')
    .digest('hex');

// Apple sends this in the X-App-Store-Signature header
```

#### Your Server's Side (Receiving)
```javascript
// Your server recreates the signature
const expectedSignature = crypto
    .createHmac('sha256', your_secret)
    .update(webhook_payload_as_string, 'utf8')
    .digest('hex');

// Compare signatures using timing-safe comparison
const isValid = crypto.timingSafeEqual(
    Buffer.from(received_signature),
    Buffer.from(expectedSignature)
);
```

### Security Best Practices

#### 1. Keep Your Secret Secure
- ✅ Store in environment variables (`.env` file)
- ✅ Use a strong, randomly generated secret
- ✅ Never commit secrets to version control
- ✅ Rotate secrets periodically

#### 2. Always Verify Signatures
- ✅ Reject webhooks without signatures
- ✅ Reject webhooks with invalid signatures
- ✅ Use timing-safe comparison to prevent timing attacks

#### 3. Additional Security Measures
- ✅ Use HTTPS only for webhook endpoints
- ✅ Implement rate limiting
- ✅ Log all webhook attempts
- ✅ Monitor for suspicious activity

### Troubleshooting Signature Verification

#### Common Issues

1. **Signature Mismatch**
   - Check that the secret matches exactly in both places
   - Ensure you're using the raw request body for verification
   - Verify the payload hasn't been modified by middleware

2. **No Signature Header**
   - Ensure you've configured a secret in App Store Connect
   - Check that the header name is exactly `X-App-Store-Signature`

3. **Invalid Signature Format**
   - Apple sends the signature as a hex string
   - Don't include any prefixes like "sha256="

#### Testing Your Setup

1. **Test Webhook in App Store Connect**
   - Use the "Test" button in the webhook configuration
   - Check your server logs for verification results

2. **Manual Testing**
   ```bash
   # Test with a known payload and signature
   curl -X POST \
     -H "Content-Type: application/json" \
     -H "X-App-Store-Signature: your_test_signature" \
     -d '{"eventType":"PING","message":"test"}' \
     https://your-domain.com/webhook/app-store-connect
   ```

### Example Webhook Payload Structure

```json
{
  "eventType": "APP_STORE_VERSION_STATE_CHANGED",
  "eventId": "12345678-1234-1234-1234-123456789012",
  "eventTime": "2024-01-01T12:00:00Z",
  "version": "1.0",
  "data": {
    "appStoreState": "READY_FOR_SALE",
    "appStoreVersionId": "12345678",
    "bundleId": "com.example.app",
    "versionString": "1.0.0"
  }
}
```

### Security Considerations

#### What the Signature Protects Against
- ✅ **Replay attacks**: Each webhook has a unique signature
- ✅ **Tampering**: Any modification invalidates the signature
- ✅ **Spoofing**: Only Apple can create valid signatures

#### What the Signature Doesn't Protect Against
- ❌ **Replay attacks over time**: Consider adding timestamp validation
- ❌ **Volume attacks**: Implement rate limiting
- ❌ **Server vulnerabilities**: Keep your server updated

### Implementation in Your Webhook Receiver

The current implementation in `webhook-receiver.js` includes:

```javascript
// Signature verification function
function verifyWebhookSignature(payload, signature, secret) {
    if (!signature || !secret) {
        return false;
    }
    
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload, 'utf8')
        .digest('hex');
    
    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );
}

// Usage in webhook handler
if (webhookSecret && signature) {
    if (!verifyWebhookSignature(payloadString, signature, webhookSecret)) {
        console.error('Invalid webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
    }
    console.log('Webhook signature verified successfully');
}
```

This ensures that only legitimate webhooks from Apple App Store Connect are processed by your server. 