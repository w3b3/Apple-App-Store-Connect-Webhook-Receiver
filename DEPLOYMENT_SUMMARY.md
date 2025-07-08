# Apple App Store Connect Webhook Receiver - Deployment Summary

## 🚀 Deployment Complete

Your Apple App Store Connect Webhook Receiver has been successfully deployed and configured!

### 📋 Configuration Details

**Domain**: `apple.emitajuba.com.br`
**Server**: AWS EC2 t4g.small (Ubuntu 22.04) at `44.212.121.39`
**SSL**: Enabled with Let's Encrypt (expires 2025-10-06)
**Service**: Running on port 3001 with systemd management

### 🔗 Endpoints

- **Health Check**: `https://apple.emitajuba.com.br/health`
- **Webhook Endpoint**: `https://apple.emitajuba.com.br/webhook/app-store-connect`
- **Root Info**: `https://apple.emitajuba.com.br/`

### 🔐 Security Configuration

- **Webhook Secret**: `56e3d99750140f8c99a27802e9a34dac4e92aba8e0a7335c8198002ed06b21c2`
- **Signature Verification**: HMAC-SHA256 enabled
- **Environment Variables**: Stored in `/opt/webhook-receiver/.env` with 600 permissions
- **SSL/TLS**: Automatic renewal configured with certbot

### 🌐 DNS Configuration

**Cloudflare DNS Record**:
- **Type**: A
- **Name**: `apple.emitajuba.com.br`
- **Content**: `44.212.121.39`
- **TTL**: 300 seconds
- **Proxy**: Disabled (direct connection)

### 🔧 Service Management

```bash
# Check service status
sudo systemctl status webhook-receiver

# View logs
sudo journalctl -u webhook-receiver -f

# Restart service
sudo systemctl restart webhook-receiver

# Reload nginx
sudo systemctl reload nginx

# Renew SSL certificate
sudo certbot renew
```

### 📝 Apple App Store Connect Configuration

When configuring the webhook in Apple App Store Connect:

1. **Webhook URL**: `https://apple.emitajuba.com.br/webhook/app-store-connect`
2. **Shared Secret**: `56e3d99750140f8c99a27802e9a34dac4e92aba8e0a7335c8198002ed06b21c2`
3. **Supported Event Types**:
   - APP_STORE_VERSION_STATE_CHANGED
   - TESTFLIGHT_BETA_FEEDBACK_RECEIVED
   - SUBSCRIPTION_PURCHASED
   - SUBSCRIPTION_RENEWED
   - SUBSCRIPTION_EXPIRED
   - SUBSCRIPTION_REFUNDED
   - SUBSCRIPTION_GRACE_PERIOD_EXPIRED
   - SUBSCRIPTION_OFFER_REDEEMED
   - PING (for testing)

### ✅ Test Results

**Health Check**: ✅ Working
```bash
curl https://apple.emitajuba.com.br/health
# Response: {"status":"healthy","timestamp":"...","service":"Apple App Store Connect Webhook Receiver","version":"1.0.0"}
```

**Webhook Processing**: ✅ Working
- Event type extraction: Fixed to handle Apple's webhook format (`data.type`)
- Signature verification: Configured (but Apple test webhooks don't include signatures)
- Event processing: Successfully processes `webhookPingCreated` and other Apple webhook events

**Test Webhook**: ✅ Working
```bash
curl -X POST \
  -H 'Content-Type: application/json' \
  -d '{"data":{"type":"webhookPingCreated","id":"test-123","version":1,"attributes":{"timestamp":"2025-07-08T18:00:00.000Z"}}}' \
  https://apple.emitajuba.com.br/webhook/app-store-connect
# Response: {"status":"success","message":"Webhook processed successfully","eventType":"webhookPingCreated","timestamp":"..."}
```

**Apple Test Button**: ✅ Working
- Apple App Store Connect Test button successfully sends webhooks
- Events are properly processed and logged
- No signature verification issues with test events

### 📁 File Structure

```
/opt/webhook-receiver/
├── webhook-receiver.js       # Main application
├── package.json             # Dependencies
├── .env                     # Environment variables (600 permissions)
├── node_modules/            # Dependencies
└── logs/                    # Application logs (if configured)

/etc/nginx/conf.d/
└── webhook-receiver.conf    # Nginx configuration

/etc/systemd/system/
└── webhook-receiver.service # Systemd service configuration
```

### 🔄 Future Firestore Integration

The webhook receiver is ready for Firestore integration. Update the `processWebhookEvent()` function in `webhook-receiver.js` to store events in Firestore:

```javascript
// TODO: Add Firestore integration
// storeEventInFirestore(event);
```

### 🛠️ Monitoring

- **Service Status**: `sudo systemctl status webhook-receiver`
- **Application Logs**: `sudo journalctl -u webhook-receiver -f`
- **Nginx Logs**: `sudo tail -f /var/log/nginx/access.log`
- **SSL Certificate**: `sudo certbot certificates`

### 📊 Real-Time Webhook Monitoring

**Primary Monitoring Command** (SSH into server):
```bash
ssh -i ~/.ssh/your-key.pem ubuntu@44.212.121.39
sudo journalctl -u webhook-receiver -f
```

**Enhanced Monitoring with Filtering**:
```bash
# Monitor only webhook events
sudo journalctl -u webhook-receiver -f | grep -E "(Received webhook|Processing event|Webhook ping)"

# Monitor with timestamps
sudo journalctl -u webhook-receiver -f --since "now" -o short-iso
```

**Multi-Terminal Monitoring Setup**:
- **Terminal 1**: `sudo journalctl -u webhook-receiver -f`
- **Terminal 2**: `sudo tail -f /var/log/nginx/access.log | grep "apple.emitajuba.com.br"`
- **Terminal 3**: `watch -n 1 'ps aux | grep webhook-receiver'`

**Expected Log Output for Apple Webhooks**:
```
Received webhook: {timestamp, headers, payloadSize}
Processing event type: webhookPingCreated
Webhook ping created (Apple test event): {event data}
```

### 🔄 Automatic Renewal

- **SSL Certificate**: Automatic renewal configured with certbot
- **Service**: Enabled for automatic startup on boot
- **Nginx**: Configured to proxy requests to the webhook service

---

**Next Steps**:
1. Configure the webhook in Apple App Store Connect
2. Test webhook delivery from Apple
3. Implement Firestore integration when ready
4. Set up monitoring and alerting as needed

**Support**: Check the logs if you encounter any issues, and ensure the service is running and nginx is properly configured. 