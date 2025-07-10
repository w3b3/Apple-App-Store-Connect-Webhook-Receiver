# Firestore Integration Guide

## Overview

The Apple App Store Connect Webhook Receiver includes comprehensive Firestore integration to automatically store, organize, and manage webhook events and server notifications. This guide covers setup, configuration, and best practices.

## Features

- ✅ **Automatic Storage**: All webhook events and server notifications are automatically stored
- ✅ **Structured Schema**: Organized collections for different event types
- ✅ **Retry Logic**: Exponential backoff for failed operations
- ✅ **Error Handling**: Comprehensive error logging and monitoring
- ✅ **Metadata Tracking**: Rich metadata for debugging and analysis
- ✅ **Performance Optimized**: Efficient writes with proper indexing

## Quick Setup

### 1. Firebase Project Setup

1. **Create Firebase Project**:
   - Visit [Firebase Console](https://console.firebase.google.com/)
   - Click "Create a project"
   - Follow setup wizard

2. **Enable Firestore**:
   - Go to "Firestore Database"
   - Click "Create database"
   - Choose "Start in production mode"
   - Select your region

3. **Generate Service Account**:
   - Go to Project Settings → Service Accounts
   - Click "Generate new private key"
   - Download the JSON file

### 2. Server Configuration

1. **Upload Service Account Key**:
   ```bash
   scp service-account-key.json ubuntu@44.212.121.39:/opt/webhook-receiver/
   sudo chmod 600 /opt/webhook-receiver/service-account-key.json
   sudo chown webhook-receiver:webhook-receiver /opt/webhook-receiver/service-account-key.json
   ```

2. **Update Environment Variables**:
   ```bash
   sudo nano /opt/webhook-receiver/.env
   ```
   
   Add:
   ```bash
   GOOGLE_APPLICATION_CREDENTIALS=/opt/webhook-receiver/service-account-key.json
   FIREBASE_PROJECT_ID=your-firebase-project-id
   FIRESTORE_ENABLED=true
   ```

3. **Install Dependencies**:
   ```bash
   cd /opt/webhook-receiver
   sudo npm install firebase-admin
   ```

4. **Restart Service**:
   ```bash
   sudo systemctl restart webhook-receiver
   sudo journalctl -u webhook-receiver -f
   ```

## Collections Schema

### Primary Collections

#### `webhook_events`
**Purpose**: Stores all App Store Connect webhook events

**Schema**:
```javascript
{
  eventType: String,              // "APP_STORE_VERSION_STATE_CHANGED", "TESTFLIGHT_BETA_FEEDBACK_RECEIVED", etc.
  timestamp: Firestore.Timestamp, // Server timestamp when stored
  receivedAt: String,             // ISO string when received
  data: Object,                   // Original webhook payload
  metadata: {
    userAgent: String,            // Request user agent
    contentType: String,          // Request content type
    hasSignature: Boolean,        // Whether signature was present
    signatureVerified: Boolean,   // Whether signature was valid
    retryCount: Number           // Number of retry attempts
  },
  processed: Boolean,             // Always true for successful storage
  source: String                  // Always "app-store-connect"
}
```

**Indexes**:
- `eventType` (ascending)
- `timestamp` (descending)
- `metadata.signatureVerified` (ascending)

#### `server_notifications`
**Purpose**: Stores App Store Server Notifications (in-app purchases)

**Schema**:
```javascript
{
  notificationType: String,       // "SUBSCRIBED", "DID_RENEW", "EXPIRED", etc.
  subtype: String,               // "INITIAL_BUY", "RESUBSCRIBE", etc.
  timestamp: Firestore.Timestamp,
  receivedAt: String,
  bundleId: String,              // App bundle identifier
  environment: String,           // "Production" or "Sandbox"
  originalNotification: Object,   // Original notification payload
  decodedPayload: Object,        // Decoded JWT payload
  metadata: {
    userAgent: String,
    contentType: String,
    jwtVerified: Boolean,        // Whether JWT was verified
    retryCount: Number
  },
  processed: Boolean,
  source: String                 // Always "app-store-server"
}
```

**Indexes**:
- `notificationType` (ascending)
- `bundleId` (ascending)
- `environment` (ascending)
- `timestamp` (descending)

### Secondary Collections

#### `purchase_events`
**Purpose**: Detailed purchase/subscription transaction data

**Schema**:
```javascript
{
  parentDocId: String,           // Reference to server_notifications document
  timestamp: Firestore.Timestamp,
  transactionId: String,         // Unique transaction ID
  originalTransactionId: String, // Original transaction ID for renewals
  productId: String,            // Product identifier
  purchaseDate: Firestore.Timestamp,
  expiresDate: Firestore.Timestamp,
  isTrialPeriod: Boolean,
  isInIntroOfferPeriod: Boolean,
  notificationType: String,
  subtype: String,
  environment: String,
  bundleId: String,
  eventData: Object             // Full decoded payload
}
```

**Indexes**:
- `transactionId` (ascending)
- `originalTransactionId` (ascending)
- `productId` (ascending)
- `purchaseDate` (descending)
- `expiresDate` (ascending)

#### `app_version_events`
**Purpose**: App version state changes

**Schema**:
```javascript
{
  parentDocId: String,           // Reference to webhook_events document
  timestamp: Firestore.Timestamp,
  appId: String,                // App Store Connect app ID
  versionString: String,        // Version number (e.g., "1.0.0")
  platform: String,            // "IOS", "MAC_OS", etc.
  appStoreState: String,        // "READY_FOR_SALE", "PENDING_DEVELOPER_RELEASE", etc.
  previousState: String,        // Previous app store state
  eventData: Object            // Full webhook payload
}
```

**Indexes**:
- `appId` (ascending)
- `versionString` (ascending)
- `appStoreState` (ascending)
- `timestamp` (descending)

#### `testflight_feedback`
**Purpose**: TestFlight feedback events

**Schema**:
```javascript
{
  parentDocId: String,
  timestamp: Firestore.Timestamp,
  feedbackId: String,           // Unique feedback ID
  appId: String,
  betaGroupName: String,        // Name of beta group
  buildVersion: String,         // Build version string
  rating: Number,               // Feedback rating
  eventData: Object
}
```

**Indexes**:
- `appId` (ascending)
- `betaGroupName` (ascending)
- `rating` (ascending)
- `timestamp` (descending)

#### `failed_storage_attempts`
**Purpose**: Monitoring and debugging failed storage operations

**Schema**:
```javascript
{
  type: String,                 // "webhook_event" or "server_notification"
  timestamp: Firestore.Timestamp,
  details: {
    eventType: String,          // Event type that failed
    error: String,              // Error message
    retryCount: Number          // Number of retries attempted
  },
  environment: String           // "production", "development", etc.
}
```

**Indexes**:
- `type` (ascending)
- `timestamp` (descending)
- `details.error` (ascending)

## Error Handling & Retry Logic

### Retry Strategy

The system implements exponential backoff with the following parameters:

- **Maximum Retries**: 3 attempts
- **Base Delay**: 1000ms
- **Backoff Multiplier**: 2x (1s, 2s, 4s)
- **Jitter**: None (deterministic for debugging)

### Retryable Errors

The following Firebase errors trigger automatic retries:

- `UNAVAILABLE` - Service temporarily unavailable
- `DEADLINE_EXCEEDED` - Request timeout
- `RESOURCE_EXHAUSTED` - Quota exceeded
- `INTERNAL` - Internal server error
- `ABORTED` - Transaction aborted

### Non-Retryable Errors

These errors are logged but not retried:

- `PERMISSION_DENIED` - Authentication/authorization issues
- `INVALID_ARGUMENT` - Malformed data
- `NOT_FOUND` - Collection/document not found
- `ALREADY_EXISTS` - Document already exists

### Error Monitoring

Failed storage attempts are logged to:

1. **Application Logs**:
   ```bash
   sudo journalctl -u webhook-receiver -f | grep -i "failed storage"
   ```

2. **Firestore Collection**:
   ```javascript
   // Query failed attempts
   db.collection('failed_storage_attempts')
     .orderBy('timestamp', 'desc')
     .limit(50)
   ```

## Performance Considerations

### Write Optimization

- **Batch Operations**: Related documents are written in batches when possible
- **Minimal Indexes**: Only essential indexes are created
- **Efficient Schema**: Denormalized data for read performance

### Monitoring Metrics

Track these metrics for performance:

- **Storage Success Rate**: `stored: true` in webhook responses
- **Retry Frequency**: Monitor `retryCount` in documents
- **Error Distribution**: Analyze `failed_storage_attempts` collection
- **Latency**: Monitor processing time in logs

### Scaling Considerations

- **Document Size**: Webhook payloads are stored as-is (typically < 1KB)
- **Write Rate**: Designed for typical webhook volumes (< 100/minute)
- **Storage Growth**: Implement data retention policies as needed

## Querying Examples

### Recent Webhook Events

```javascript
// Get last 50 webhook events
db.collection('webhook_events')
  .orderBy('timestamp', 'desc')
  .limit(50)
  .get()
```

### App Version Changes

```javascript
// Get version state changes for specific app
db.collection('app_version_events')
  .where('appId', '==', '1234567890')
  .orderBy('timestamp', 'desc')
  .get()
```

### Purchase Events by Product

```javascript
// Get subscription events for specific product
db.collection('purchase_events')
  .where('productId', '==', 'com.yourapp.premium')
  .where('notificationType', '==', 'SUBSCRIBED')
  .orderBy('purchaseDate', 'desc')
  .get()
```

### Failed Storage Analysis

```javascript
// Analyze failed storage attempts
db.collection('failed_storage_attempts')
  .where('type', '==', 'webhook_event')
  .orderBy('timestamp', 'desc')
  .limit(100)
  .get()
```

## Security Best Practices

### Service Account Security

1. **Minimal Permissions**: Grant only Firestore read/write access
2. **File Permissions**: Set service account key to 600 permissions
3. **Key Rotation**: Rotate service account keys regularly
4. **Environment Isolation**: Use separate Firebase projects for dev/prod

### Data Privacy

1. **PII Handling**: Webhook payloads may contain user data
2. **Retention Policies**: Implement data retention according to privacy laws
3. **Access Control**: Restrict Firestore access to authorized users only
4. **Audit Logging**: Monitor database access patterns

### Firestore Security Rules

```javascript
// Example security rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Only allow server-side access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## Troubleshooting

### Common Issues

1. **Service Account Authentication**:
   ```bash
   # Check file permissions
   ls -la /opt/webhook-receiver/service-account-key.json
   
   # Verify environment variables
   sudo cat /opt/webhook-receiver/.env | grep FIREBASE
   ```

2. **Firestore Connection**:
   ```bash
   # Check initialization logs
   sudo journalctl -u webhook-receiver -f | grep -i firestore
   ```

3. **Storage Failures**:
   ```bash
   # Monitor failed attempts
   sudo journalctl -u webhook-receiver -f | grep -i "failed storage"
   ```

### Debugging Steps

1. **Verify Configuration**:
   - Check Firebase project ID
   - Verify service account key path
   - Confirm FIRESTORE_ENABLED=true

2. **Test Connection**:
   - Restart webhook service
   - Send test webhook
   - Check response includes `"stored": true`

3. **Monitor Logs**:
   - Watch real-time logs during webhook processing
   - Check for initialization errors
   - Monitor retry attempts

### Support Resources

- [Firebase Documentation](https://firebase.google.com/docs/firestore)
- [Node.js Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Firestore Error Codes](https://firebase.google.com/docs/firestore/handle-errors)

## Maintenance

### Regular Tasks

1. **Monitor Storage Usage**:
   ```bash
   # Check Firebase console for storage metrics
   # Set up billing alerts
   ```

2. **Review Failed Attempts**:
   ```bash
   # Weekly review of failed_storage_attempts
   # Address recurring issues
   ```

3. **Update Dependencies**:
   ```bash
   # Keep firebase-admin updated
   sudo npm update firebase-admin
   ```

### Data Retention

Consider implementing data retention policies:

```javascript
// Example: Delete old events after 1 year
const oneYearAgo = new Date();
oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

db.collection('webhook_events')
  .where('timestamp', '<', oneYearAgo)
  .get()
  .then(snapshot => {
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    return batch.commit();
  });
```

---

For additional support or questions about the Firestore integration, refer to the main [README.md](./README.md) or check the service logs. 