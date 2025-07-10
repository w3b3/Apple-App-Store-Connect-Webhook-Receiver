# Apple App Store Connect Webhook Receiver

A secure, modular webhook receiver for Apple App Store Connect notifications, designed for AWS EC2 with nginx and SSL support.

## Quick Start

1. **Deploy the Service**: Follow the [Deployment Guide](docs/DEPLOYMENT_GUIDE.md)
2. **Configure Security**: Set up webhook secrets using the [Security Guide](docs/WEBHOOK_SECURITY.md)
3. **Test Integration**: Use the [Test Notifications Guide](docs/TEST_NOTIFICATIONS.md)

## Architecture

Built with a modular Node.js architecture:

```
src/
├── app.js                     # Main application entry point
├── config/                    # Configuration management
├── auth/                      # Authentication services
├── database/                  # Firestore database operations
├── services/                  # Apple API service
├── handlers/                  # Webhook event processing
├── middleware/                # Express middleware
└── routes/                    # Route definitions
```

## Features

- ✅ **Secure webhook verification** with HMAC-SHA256 signature validation
- ✅ **JWT signature verification** for App Store Server Notifications
- ✅ **Test notification API** for testing webhook endpoints
- ✅ **Firestore integration** with automatic retry logic
- ✅ **Health check endpoint** for monitoring
- ✅ **Nginx reverse proxy** with SSL support
- ✅ **Systemd service** for automatic startup

## Documentation

### Setup & Deployment
- 📋 [**Deployment Guide**](docs/DEPLOYMENT_GUIDE.md) - Complete deployment instructions
- 📊 [**Deployment Status**](docs/DEPLOYMENT_STATUS.md) - Current deployment state
- 📝 [**Deployment Summary**](docs/DEPLOYMENT_SUMMARY.md) - Deployment overview

### Security
- 🔐 [**Security Summary**](docs/SECURITY_SUMMARY.md) - Security implementation overview
- 🛡️ [**Webhook Security**](docs/WEBHOOK_SECURITY.md) - Detailed security setup

### Integration & Testing
- 🔥 [**Firestore Integration**](docs/FIRESTORE_INTEGRATION.md) - Database setup and schema
- 🧪 [**Test Notifications**](docs/TEST_NOTIFICATIONS.md) - Testing webhook endpoints
- 📋 [**Test Implementation**](docs/TEST_NOTIFICATIONS_IMPLEMENTATION.md) - Test setup details
- 📊 [**Test Results**](docs/ASSN_TEST_RESULTS.md) - App Store Server Notification test results

### Development
- 🏗️ [**Implementation Summary**](docs/IMPLEMENTATION_SUMMARY.md) - Complete implementation details
- 🔄 [**Refactoring Summary**](docs/REFACTORING_SUMMARY.md) - Architecture refactoring details
- 🔧 [**JWT Verification**](docs/JWT_VERIFICATION_COMPLETED.md) - JWT implementation
- 📝 [**JWT Simplified**](docs/JWT_VERIFICATION_SIMPLIFIED.md) - JWT setup guide

## Quick Reference

### API Endpoints
- `GET /health` - Health check
- `POST /webhook/app-store-connect` - Webhook receiver
- `POST /webhook/app-store-server-notifications` - Server notifications
- `POST /test/request-notification` - Request test notification
- `GET /test/notification-status/:token` - Check test status

### Service Management
```bash
# Service control
sudo systemctl start|stop|restart webhook-receiver
sudo systemctl status webhook-receiver

# View logs
sudo journalctl -u webhook-receiver -f
```

### Configuration
- **Application**: `/opt/webhook-receiver/`
- **Environment**: `/opt/webhook-receiver/.env`
- **Nginx Config**: `/etc/nginx/conf.d/webhook-receiver.conf`

## Server Information

- **Instance**: AWS EC2 (44.212.121.39)
- **OS**: Ubuntu 22.04 LTS
- **Runtime**: Node.js 20+
- **Reverse Proxy**: Nginx with SSL

## Support

For detailed setup, troubleshooting, and configuration instructions, please refer to the comprehensive documentation in the [`docs/`](docs/) folder.

## License

MIT License 