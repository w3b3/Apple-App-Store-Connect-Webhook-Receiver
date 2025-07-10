# Apple App Store Connect Webhook Receiver

A lightweight, secure webhook receiver for Apple App Store Connect notifications, designed to run on AWS EC2 with nginx and SSL support. Built with a modular architecture for better maintainability and scalability.

## Overview

This service receives webhook notifications from Apple App Store Connect and can be configured to store events in Firestore or other databases. It's built with Node.js 20+, Express, and includes proper signature verification for security.

### Architecture

The application follows a modular architecture with clear separation of concerns:

```
src/
├── app.js                     # Main application entry point
├── config/
│   └── index.js              # Configuration management
├── auth/
│   └── index.js              # Authentication services
├── database/
│   └── firestore.js          # Firestore database operations
├── services/
│   └── appleApi.js           # Apple API service
├── handlers/
│   └── webhookHandlers.js    # Webhook event processing
├── middleware/
│   └── index.js              # Express middleware
└── routes/
    └── index.js              # Route definitions
```

## Features

- ✅ **Secure webhook verification** with HMAC-SHA256 signature validation
- ✅ **JWT signature verification** for App Store Server Notifications
- ✅ **Test notification API** for testing webhook endpoints directly from Apple
- ✅ **Multiple event type support** (app version changes, TestFlight feedback, etc.)
- ✅ **Firestore integration** with automatic retry logic and error handling
- ✅ **Health check endpoint** for monitoring
- ✅ **Nginx reverse proxy** with SSL support
- ✅ **Systemd service** for automatic startup and management
- ✅ **Structured logging** with timestamps
- ✅ **Graceful shutdown** handling
- ✅ **Comprehensive error handling** with proper HTTP status codes

## Supported Webhook Events

- `APP_STORE_VERSION_STATE_CHANGED` - App version status changes
- `TESTFLIGHT_BETA_FEEDBACK_RECEIVED` - New TestFlight feedback
- `SUBSCRIPTION_*` - Various subscription events
- `PING` - Test webhook events
- And more...

## Quick Start

### 1. Deploy the Service

```bash
# Copy all files to your EC2 instance
scp -r src/ package.json deploy-with-test-notifications.sh ubuntu@44.212.121.39:~/

# SSH to your server and deploy
ssh ubuntu@44.212.121.39
chmod +x deploy-with-test-notifications.sh
./deploy-with-test-notifications.sh
```

### 2. Configure Nginx and SSL

```bash
# Copy nginx configuration files
scp webhook-receiver.nginx.conf setup-nginx.sh ubuntu@44.212.121.39:~/

# SSH to your server and setup nginx
ssh ubuntu@44.212.121.39
chmod +x setup-nginx.sh
./setup-nginx.sh
```

### 3. Configure DNS

Point your domain to your EC2 instance:
- Domain: `webhook.yourdomain.com`
- IP: `44.212.121.39`

### 4. Set Webhook Secret

```bash
# Edit the environment file
sudo nano /opt/webhook-receiver/.env

# Add your webhook secret
APP_STORE_WEBHOOK_SECRET=your-secret-here
```

### 5. Configure Apple App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to Users and Access → Integrations → Webhooks
3. Create a new webhook:
   - **Name**: Your app webhook
   - **Payload URL**: `https://webhook.yourdomain.com/webhook/app-store-connect`
   - **Secret**: Same as configured in step 4
   - **Events**: Select desired event types

## API Endpoints

### Health Check
```
GET /health
```
Returns service status and version information.

### Root Endpoint
```
GET /
```
Returns service information and available endpoints.

### Webhook Endpoint
```
POST /webhook/app-store-connect
```
Receives webhook notifications from Apple App Store Connect.

### Server Notifications Endpoint
```
POST /webhook/app-store-server-notifications
```
Receives App Store Server Notifications for in-app purchases and subscriptions.

### Test Notification Endpoints
```
POST /test/request-notification
```
Requests a test notification from Apple's servers to verify your webhook endpoint is working correctly.

```
GET /test/notification-status/:token
```
Checks the status of a previously requested test notification.

**Note**: Test notifications require additional configuration. See [TEST_NOTIFICATIONS.md](TEST_NOTIFICATIONS.md) for detailed setup instructions.

## Service Management

### Systemd Commands
```bash
# Start the service
sudo systemctl start webhook-receiver

# Stop the service
sudo systemctl stop webhook-receiver

# Restart the service
sudo systemctl restart webhook-receiver

# Check status
sudo systemctl status webhook-receiver

# View logs
sudo journalctl -u webhook-receiver -f
```

### Nginx Commands
```bash
# Test configuration
sudo nginx -t

# Reload configuration
sudo systemctl reload nginx

# Restart nginx
sudo systemctl restart nginx
```

## Configuration Files

### Service Configuration
- **Application**: `/opt/webhook-receiver/`
- **Source Code**: `/opt/webhook-receiver/src/`
- **Environment**: `/opt/webhook-receiver/.env`
- **Systemd Service**: `/etc/systemd/system/webhook-receiver.service`

### Nginx Configuration
- **Main Config**: `/etc/nginx/conf.d/webhook-receiver.conf`
- **SSL Certificates**: `/etc/letsencrypt/live/yourdomain.com/`

## Environment Variables

```bash
NODE_ENV=production
PORT=3001
APP_STORE_WEBHOOK_SECRET=your-webhook-secret-here

# Firestore Configuration
GOOGLE_APPLICATION_CREDENTIALS=/opt/webhook-receiver/service-account-key.json
FIREBASE_PROJECT_ID=your-firebase-project-id
FIRESTORE_ENABLED=true
```

## Firestore Integration

The webhook receiver automatically stores all webhook events and server notifications in Firestore with the following features:

### Collections Schema

#### `webhook_events` Collection
Stores all App Store Connect webhook events:
```javascript
{
  eventType: "APP_STORE_VERSION_STATE_CHANGED",
  timestamp: Firestore.Timestamp,
  receivedAt: "2024-01-01T00:00:00.000Z",
  data: { /* original webhook payload */ },
  metadata: {
    userAgent: "Apple/1.0",
    contentType: "application/json",
    hasSignature: true,
    signatureVerified: true,
    retryCount: 0
  },
  processed: true,
  source: "app-store-connect"
}
```

#### `server_notifications` Collection
Stores App Store Server Notifications:
```javascript
{
  notificationType: "SUBSCRIBED",
  subtype: "INITIAL_BUY",
  timestamp: Firestore.Timestamp,
  receivedAt: "2024-01-01T00:00:00.000Z",
  bundleId: "com.yourapp.bundle",
  environment: "Production",
  originalNotification: { /* original notification */ },
  decodedPayload: { /* decoded JWT payload */ },
  metadata: {
    userAgent: "Apple/1.0",
    contentType: "application/json",
    jwtVerified: true,
    retryCount: 0
  },
  processed: true,
  source: "app-store-server"
}
```

#### `purchase_events` Collection
Stores detailed purchase/subscription data:
```javascript
{
  parentDocId: "reference-to-server-notification",
  timestamp: Firestore.Timestamp,
  transactionId: "1000000123456789",
  originalTransactionId: "1000000123456789",
  productId: "com.yourapp.premium",
  purchaseDate: Firestore.Timestamp,
  expiresDate: Firestore.Timestamp,
  isTrialPeriod: false,
  isInIntroOfferPeriod: false,
  notificationType: "SUBSCRIBED",
  subtype: "INITIAL_BUY",
  environment: "Production",
  bundleId: "com.yourapp.bundle",
  eventData: { /* full decoded payload */ }
}
```

#### `app_version_events` Collection
Stores app version state changes:
```javascript
{
  parentDocId: "reference-to-webhook-event",
  timestamp: Firestore.Timestamp,
  appId: "1234567890",
  versionString: "1.0.0",
  platform: "IOS",
  appStoreState: "READY_FOR_SALE",
  previousState: "PENDING_DEVELOPER_RELEASE",
  eventData: { /* full webhook payload */ }
}
```

#### `testflight_feedback` Collection
Stores TestFlight feedback events:
```javascript
{
  parentDocId: "reference-to-webhook-event",
  timestamp: Firestore.Timestamp,
  feedbackId: "feedback-123",
  appId: "1234567890",
  betaGroupName: "Internal Testing",
  buildVersion: "1.0.0 (100)",
  rating: 5,
  eventData: { /* full webhook payload */ }
}
```

#### `failed_storage_attempts` Collection
Logs failed storage attempts for monitoring:
```javascript
{
  type: "webhook_event",
  timestamp: Firestore.Timestamp,
  details: {
    eventType: "APP_STORE_VERSION_STATE_CHANGED",
    error: "DEADLINE_EXCEEDED",
    retryCount: 3
  },
  environment: "production"
}
```

### Retry Logic

The system implements exponential backoff retry logic for failed Firestore operations:

- **Maximum Retries**: 3 attempts
- **Retry Delay**: 1s, 2s, 4s (exponential backoff)
- **Retryable Errors**: `UNAVAILABLE`, `DEADLINE_EXCEEDED`, `RESOURCE_EXHAUSTED`, `INTERNAL`, `ABORTED`
- **Timeout/Network Errors**: Automatically retried

### Setup Instructions

1. **Create Firebase Project**:
   ```bash
   # Visit https://console.firebase.google.com/
   # Create a new project
   # Enable Firestore Database
   ```

2. **Generate Service Account Key**:
   ```bash
   # In Firebase Console: Project Settings → Service Accounts
   # Generate new private key
   # Download JSON file
   ```

3. **Configure Environment**:
   ```bash
   # Copy service account key to server
   scp service-account-key.json ubuntu@44.212.121.39:/opt/webhook-receiver/
   
   # Update environment variables
   sudo nano /opt/webhook-receiver/.env
   ```

4. **Restart Service**:
   ```bash
   sudo systemctl restart webhook-receiver
   ```

### Monitoring Firestore

Check storage status in webhook responses:
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"data":{"type":"PING"}}' \
  https://apple.emitajuba.com.br/webhook/app-store-connect

# Response includes storage status:
{
  "status": "success",
  "message": "Webhook processed successfully",
  "eventType": "PING",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "stored": true
}
```

View failed storage attempts:
```bash
sudo journalctl -u webhook-receiver -f | grep -i "failed storage"
```

## Security Features

### Signature Verification
The service validates webhook signatures using HMAC-SHA256:
```javascript
const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
```

### Security Headers
Nginx adds security headers:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security` (HTTPS only)

## Monitoring

### Health Check
```bash
curl https://webhook.yourdomain.com/health
```

### Service Status
```bash
sudo systemctl status webhook-receiver
```

### Logs
```bash
# Real-time logs
sudo journalctl -u webhook-receiver -f

# Recent logs
sudo journalctl -u webhook-receiver -n 50
```

## Troubleshooting

### Service Won't Start
```bash
# Check logs
sudo journalctl -u webhook-receiver -n 20

# Check port availability
sudo lsof -i :3001

# Restart service
sudo systemctl restart webhook-receiver
```

### SSL Issues
```bash
# Check certificate status
sudo certbot certificates

# Renew certificates
sudo certbot renew

# Test nginx configuration
sudo nginx -t
```

### Webhook Not Receiving Events
1. Check DNS resolution
2. Verify SSL certificate
3. Check webhook URL in App Store Connect
4. Verify webhook secret matches
5. Check service logs for errors

## Future Enhancements

### Firestore Integration
The service is ready for Firestore integration. To add:

1. Install Firebase Admin SDK:
```bash
npm install firebase-admin
```

2. Add service account credentials
3. Update `processWebhookEvent()` function to store events

### Example Firestore Integration
```javascript
const admin = require('firebase-admin');

// Initialize Firebase
admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'your-project-id'
});

const db = admin.firestore();

async function storeEventInFirestore(event) {
    await db.collection('webhook-events').add({
        ...event,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
}
```

## System Architecture

```
Apple App Store Connect
        ↓
   [Internet/DNS]
        ↓
   [Nginx (Port 80/443)]
        ↓
   [Node.js Service (Port 3001)]
        ↓
   [Firestore Database]
```

### Application Architecture

The application is built with a modular architecture that separates concerns:

- **Configuration Layer**: Centralized environment and application settings
- **Authentication Layer**: JWT verification and signature validation
- **Database Layer**: Firestore integration with retry logic
- **Service Layer**: Apple API interactions and external services
- **Handler Layer**: Business logic for processing webhook events
- **Middleware Layer**: Request processing and error handling
- **Route Layer**: API endpoint definitions and request routing

## Server Information

- **Instance**: AWS EC2 t4g.small
- **OS**: Ubuntu 22.04 LTS
- **IP**: 44.212.121.39
- **Node.js**: 20.19.3
- **Nginx**: 1.28.0

## Support

For issues or questions:
1. Check the logs: `sudo journalctl -u webhook-receiver -f`
2. Verify configuration files
3. Test endpoints manually
4. Check Apple App Store Connect webhook status

## License

MIT License - see LICENSE file for details. 