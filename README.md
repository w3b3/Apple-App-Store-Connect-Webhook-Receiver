# Apple App Store Connect Webhook Receiver

A lightweight, secure webhook receiver for Apple App Store Connect notifications, designed to run on AWS EC2 with nginx and SSL support.

## Overview

This service receives webhook notifications from Apple App Store Connect and can be configured to store events in Firestore or other databases. It's built with Node.js 20+, Express, and includes proper signature verification for security.

## Features

- ✅ **Secure webhook verification** with HMAC-SHA256 signature validation
- ✅ **Multiple event type support** (app version changes, TestFlight feedback, etc.)
- ✅ **Health check endpoint** for monitoring
- ✅ **Nginx reverse proxy** with SSL support
- ✅ **Systemd service** for automatic startup and management
- ✅ **Structured logging** with timestamps
- ✅ **Graceful shutdown** handling
- ✅ **Ready for Firestore integration**

## Supported Webhook Events

- `APP_STORE_VERSION_STATE_CHANGED` - App version status changes
- `TESTFLIGHT_BETA_FEEDBACK_RECEIVED` - New TestFlight feedback
- `SUBSCRIPTION_*` - Various subscription events
- `PING` - Test webhook events
- And more...

## Quick Start

### 1. Deploy the Service

```bash
# Copy files to your EC2 instance
scp webhook-receiver.js package.json deploy.sh ubuntu@44.212.121.39:~/

# SSH to your server and deploy
ssh ubuntu@44.212.121.39
chmod +x deploy.sh
./deploy.sh
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

## Architecture

```
Apple App Store Connect
        ↓
   [Internet/DNS]
        ↓
   [Nginx (Port 80/443)]
        ↓
   [Node.js Service (Port 3001)]
        ↓
   [Future: Firestore Database]
```

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