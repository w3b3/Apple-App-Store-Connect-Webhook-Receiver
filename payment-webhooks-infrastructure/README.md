# Multi-Provider Webhook Infrastructure

A scalable, secure webhook infrastructure supporting multiple payment providers (Apple App Store Connect, Stripe, Google Play) with shared infrastructure components and automated deployment.

## 🏗️ Architecture Overview

```
payment-webhooks-infrastructure/
├── services/
│   ├── apple-webhook-receiver/       # Apple App Store Connect webhook service
│   ├── stripe-webhook-receiver/      # Stripe webhook service (coming soon)
│   └── google-play-webhook-receiver/ # Google Play webhook service (coming soon)
├── shared-infrastructure/
│   ├── templates/                    # Reusable service templates
│   ├── scripts/                      # Deployment and automation scripts
│   ├── nginx/                        # Nginx configuration templates
│   ├── firestore/                    # Shared Firestore utilities
│   └── monitoring/                   # Monitoring and alerting
└── docs/                            # Project documentation
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- AWS EC2 instance (Ubuntu 22.04 LTS)
- Cloudflare account with API token
- Firebase project with Firestore enabled

### Environment Setup

1. **Configure Cloudflare API**:
   ```bash
   export CLOUDFLARE_TOKEN="your_cloudflare_token"
   export CLOUDFLARE_ZONE_ID="your_zone_id"
   ```

2. **Test Cloudflare connection**:
   ```bash
   ./shared-infrastructure/scripts/cloudflare-dns.js verify
   ```

3. **Deploy a service**:
   ```bash
   ./shared-infrastructure/scripts/deploy-service.sh apple-webhook-receiver 3000 yourdomain.com
   ```

## 📋 Implementation Status

### ✅ Phase 1: Infrastructure Setup (COMPLETED)
- [x] Project structure created
- [x] Apple service moved to new structure
- [x] Shared infrastructure templates created
- [x] Cloudflare DNS automation implemented
- [x] Deployment scripts created

### 🔄 Phase 2: Stripe Webhook Service (PENDING)
- [ ] Stripe service implementation
- [ ] Stripe authentication & signature verification
- [ ] Stripe webhook handlers
- [ ] Stripe Firestore integration

### 🔄 Phase 3: Google Play Webhook Service (PENDING)
- [ ] Google Play service implementation
- [ ] Google Play authentication & signature verification
- [ ] Google Play webhook handlers
- [ ] Google Play Firestore integration

### 🔄 Phase 4: Shared Infrastructure (PENDING)
- [ ] Enhanced monitoring system
- [ ] Centralized logging
- [ ] Error handling patterns
- [ ] Configuration validation

### 🔄 Phase 5: Deployment & DNS (PENDING)
- [ ] Deploy all services to EC2
- [ ] Configure Cloudflare DNS records
- [ ] Setup SSL certificates
- [ ] Configure nginx load balancing

### 🔄 Phase 6: Testing & Validation (PENDING)
- [ ] End-to-end testing scripts
- [ ] Webhook endpoint validation
- [ ] Firestore integration testing
- [ ] DNS and SSL testing

### 🔄 Phase 7: Documentation & Monitoring (PENDING)
- [ ] Complete API documentation
- [ ] Monitoring dashboards
- [ ] Alerting configuration
- [ ] Maintenance procedures

## 🛠️ Services

### Apple App Store Connect Webhook Receiver
- **Port**: 3000
- **Domain**: `apple-webhook-receiver.yourdomain.com`
- **Status**: ✅ Active
- **Features**: JWT verification, HMAC signature validation, Firestore integration

### Stripe Webhook Receiver
- **Port**: 3001
- **Domain**: `stripe-webhook-receiver.yourdomain.com`
- **Status**: 🔄 Coming Soon
- **Features**: Signature verification, event handling, Firestore integration

### Google Play Webhook Receiver
- **Port**: 3002
- **Domain**: `google-play-webhook-receiver.yourdomain.com`
- **Status**: 🔄 Coming Soon
- **Features**: JWT verification, subscription handling, Firestore integration

## 🔧 Shared Infrastructure

### Templates
- **App Template**: Generic Express.js application structure
- **Config Template**: Environment-based configuration management
- **Middleware Template**: Common middleware patterns
- **Package Template**: Standardized package.json

### Scripts
- **Cloudflare DNS**: Automated DNS record management
- **Deploy Service**: Automated service deployment to EC2
- **Monitor Webhooks**: Service health monitoring

### Firestore Integration
- **Generic Service**: Provider-agnostic Firestore operations
- **Retry Logic**: Exponential backoff for failed operations
- **Error Logging**: Centralized error tracking

## 🌐 Deployment

### Server Configuration
- **Instance**: AWS EC2 (44.212.121.39)
- **OS**: Ubuntu 22.04 LTS
- **Runtime**: Node.js 20+
- **Reverse Proxy**: Nginx with SSL
- **SSL**: Let's Encrypt via Certbot

### DNS Management
All DNS records are managed via Cloudflare API:
```bash
# Setup DNS for a service
./shared-infrastructure/scripts/cloudflare-dns.js setup-webhook service-name 44.212.121.39 yourdomain.com

# List existing records
./shared-infrastructure/scripts/cloudflare-dns.js list

# Verify API token
./shared-infrastructure/scripts/cloudflare-dns.js verify
```

### Service Deployment
```bash
# Deploy a service
./shared-infrastructure/scripts/deploy-service.sh <service-name> <port> <domain>

# Example: Deploy Apple webhook service
./shared-infrastructure/scripts/deploy-service.sh apple-webhook-receiver 3000 yourdomain.com
```

## 📊 Monitoring

### Service Health
- Health check endpoints: `/health`
- Systemd service monitoring
- Nginx access logs
- Application logs via journalctl

### Webhook Monitoring
- Firestore event logging
- Failed webhook attempt tracking
- Retry mechanism monitoring
- Performance metrics

## 🔐 Security

### Authentication
- **Apple**: JWT signature verification with x5c certificate chains
- **Stripe**: HMAC-SHA256 signature verification
- **Google Play**: JWT signature verification

### Network Security
- HTTPS-only communication
- Security headers (HSTS, CSP, etc.)
- Rate limiting
- IP whitelisting (configurable)

### Data Protection
- Encrypted data transmission
- Secure environment variable management
- Firestore security rules
- Audit logging

## 📚 Documentation

### Service-Specific Documentation
- [Apple Webhook Service](services/apple-webhook-receiver/docs/)
- [Stripe Webhook Service](services/stripe-webhook-receiver/docs/) (Coming Soon)
- [Google Play Webhook Service](services/google-play-webhook-receiver/docs/) (Coming Soon)

### Implementation Guides
- [Multi-Provider Expansion Plan](docs/MULTI_PROVIDER_EXPANSION_PLAN.md)
- [Deployment Guide](docs/DEPLOYMENT_GUIDE.md)
- [Security Guide](docs/SECURITY_GUIDE.md)

## 🤝 Contributing

1. Follow the existing code structure and patterns
2. Update documentation for any changes
3. Test deployments on staging environment
4. Follow security best practices
5. Update the implementation status in this README

## 📝 License

MIT License - see LICENSE file for details

## 🆘 Support

For support and troubleshooting:
1. Check service logs: `sudo journalctl -u <service-name> -f`
2. Verify service status: `sudo systemctl status <service-name>`
3. Check nginx configuration: `sudo nginx -t`
4. Review Firestore logs in the Firebase Console
5. Test webhook endpoints with curl

## 🔄 Roadmap

- [ ] Add webhook event replay functionality
- [ ] Implement webhook event analytics dashboard
- [ ] Add support for additional payment providers
- [ ] Implement webhook event filtering and routing
- [ ] Add webhook event transformation capabilities
- [ ] Implement webhook event archiving and cleanup 