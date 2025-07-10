# Multi-Provider Webhook Infrastructure Expansion Plan

## Overview

This document outlines the comprehensive execution plan for expanding the current Apple App Store Connect Webhook Receiver into a multi-provider webhook infrastructure supporting Apple, Stripe, and Google Play webhooks through separate, dedicated services with shared infrastructure components.

## 🎯 Project Goals

- **Scalability**: Independent services for each payment provider
- **Maintainability**: Shared infrastructure components to reduce duplication
- **Security**: Provider-specific authentication and security implementations
- **Reliability**: Isolated failures and independent scaling
- **Automation**: Cloudflare API integration for domain management

## 📋 Task Execution Status

### Phase 1: Infrastructure Setup and Planning
- [x] **Task 1.1**: Create project directory structure
- [x] **Task 1.2**: Move current Apple service to new structure
- [x] **Task 1.3**: Create shared infrastructure templates
- [x] **Task 1.4**: Set up Cloudflare DNS automation scripts
- [x] **Task 1.5**: Create universal deployment scripts

### Phase 2: Stripe Webhook Service Implementation
- [ ] **Task 2.1**: Create Stripe service structure from Apple template
- [ ] **Task 2.2**: Update Stripe configuration module
- [ ] **Task 2.3**: Implement Stripe authentication service
- [ ] **Task 2.4**: Create Stripe webhook handlers
- [ ] **Task 2.5**: Update Stripe routes and middleware
- [ ] **Task 2.6**: Implement Stripe Firestore integration
- [ ] **Task 2.7**: Create Stripe environment configuration

### Phase 3: Google Play Webhook Service Implementation
- [ ] **Task 3.1**: Create Google Play service structure
- [ ] **Task 3.2**: Update Google Play configuration module
- [ ] **Task 3.3**: Implement Google Play authentication service
- [ ] **Task 3.4**: Create Google Play webhook handlers
- [ ] **Task 3.5**: Update Google Play routes and middleware
- [ ] **Task 3.6**: Implement Google Play Firestore integration
- [ ] **Task 3.7**: Create Google Play environment configuration

### Phase 4: Shared Infrastructure Components
- [ ] **Task 4.1**: Create shared Firestore base service
- [ ] **Task 4.2**: Create shared monitoring utilities
- [ ] **Task 4.3**: Create shared security patterns
- [ ] **Task 4.4**: Create shared error handling middleware
- [ ] **Task 4.5**: Create shared configuration validation

### Phase 5: Deployment and Domain Configuration
- [ ] **Task 5.1**: Deploy Stripe service to EC2
- [ ] **Task 5.2**: Configure Stripe subdomain via Cloudflare API
- [ ] **Task 5.3**: Deploy Google Play service to EC2
- [ ] **Task 5.4**: Configure Google Play subdomain via Cloudflare API
- [ ] **Task 5.5**: Set up SSL certificates for all services
- [ ] **Task 5.6**: Configure nginx for all services

### Phase 6: Testing and Validation
- [ ] **Task 6.1**: Create comprehensive testing scripts
- [ ] **Task 6.2**: Test all service health endpoints
- [ ] **Task 6.3**: Test webhook endpoints with mock data
- [ ] **Task 6.4**: Validate Firestore integration for all services
- [ ] **Task 6.5**: Test Cloudflare DNS management

### Phase 7: Documentation and Monitoring
- [ ] **Task 7.1**: Create main infrastructure documentation
- [ ] **Task 7.2**: Create service-specific documentation
- [ ] **Task 7.3**: Set up monitoring and alerting
- [ ] **Task 7.4**: Create maintenance scripts
- [ ] **Task 7.5**: Update deployment guides

## 🏗️ Target Architecture

```
├── services/
│   ├── apple-webhook-receiver/          # Existing Apple service (Port 3001)
│   ├── stripe-webhook-receiver/         # New Stripe service (Port 3002)
│   └── google-play-webhook-receiver/    # New Google Play service (Port 3003)
├── shared-infrastructure/
│   ├── cloudflare/                      # Cloudflare API automation
│   ├── nginx/                           # Nginx configuration templates
│   ├── scripts/                         # Deployment and maintenance scripts
│   ├── monitoring/                      # Shared monitoring utilities
│   ├── firestore/                       # Shared database utilities
│   ├── security/                        # Common security patterns
│   └── docs/                            # Documentation templates
└── docs/
    ├── MULTI_PROVIDER_EXPANSION_PLAN.md # This document
    ├── STRIPE_INTEGRATION_GUIDE.md      # Stripe-specific guide
    ├── GOOGLE_PLAY_INTEGRATION_GUIDE.md # Google Play-specific guide
    └── SHARED_INFRASTRUCTURE_GUIDE.md   # Shared components guide
```

## 🌐 Domain Structure

- **Apple**: `apple.emitajuba.com.br` (existing, Port 3001)
- **Stripe**: `stripe.emitajuba.com.br` (new, Port 3002)
- **Google Play**: `googleplay.emitajuba.com.br` (new, Port 3003)

## 📝 Detailed Task Execution

---

## Phase 1: Infrastructure Setup and Planning

### ✅ Task 1.1: Create Project Directory Structure
**Status**: ❌ **Not Started**

**Objective**: Create the new multi-provider directory structure

**Actions**:
1. Create parent directory for payment webhooks infrastructure
2. Create service directories for each provider
3. Create shared infrastructure directories
4. Set up documentation structure

**Commands**:
```bash
# Create the new directory structure
mkdir -p ../payment-webhooks-infrastructure
cd ../payment-webhooks-infrastructure

# Create service directories
mkdir -p services/apple-webhook-receiver
mkdir -p services/stripe-webhook-receiver  
mkdir -p services/google-play-webhook-receiver

# Create shared infrastructure
mkdir -p shared-infrastructure/cloudflare
mkdir -p shared-infrastructure/nginx
mkdir -p shared-infrastructure/scripts
mkdir -p shared-infrastructure/monitoring
mkdir -p shared-infrastructure/firestore
mkdir -p shared-infrastructure/security
mkdir -p shared-infrastructure/docs

# Create documentation structure
mkdir -p docs
```

**Deliverables**:
- Complete directory structure
- Initial README.md files in each directory

**Dependencies**: None

---

### ✅ Task 1.2: Move Current Apple Service to New Structure
**Status**: ❌ **Not Started**

**Objective**: Move the existing Apple webhook receiver to the new structure

**Actions**:
1. Copy current Apple service to new location
2. Update package.json references
3. Update documentation references
4. Preserve all existing functionality

**Commands**:
```bash
# Copy current Apple service to new structure
cp -r "Apple App Store Connect Webhook Receiver"/* services/apple-webhook-receiver/

# Update README to reflect new structure
cd services/apple-webhook-receiver
# Update any internal path references if needed
```

**Deliverables**:
- Apple service in new location
- Updated internal references
- Preserved functionality

**Dependencies**: Task 1.1

---

### ✅ Task 1.3: Create Shared Infrastructure Templates
**Status**: ❌ **Not Started**

**Objective**: Create reusable templates for nginx, deployment scripts, and monitoring

**Actions**:
1. Create nginx configuration template
2. Create universal deployment script template
3. Create monitoring script templates
4. Create environment configuration templates

**Files to Create**:
- `shared-infrastructure/nginx/webhook-template.conf`
- `shared-infrastructure/scripts/deploy-service.sh`
- `shared-infrastructure/scripts/monitor-services.sh`
- `shared-infrastructure/scripts/test-services.sh`

**Template Features**:
- Parameterized configurations (DOMAIN_PLACEHOLDER, PORT_PLACEHOLDER)
- SSL/TLS support
- Health check endpoints
- Security headers
- Error handling

**Dependencies**: Task 1.1

---

### ✅ Task 1.4: Set Up Cloudflare DNS Automation Scripts
**Status**: ❌ **Not Started**

**Objective**: Create scripts to automate DNS record creation via Cloudflare API

**Actions**:
1. Create Cloudflare API authentication script
2. Create DNS record creation script
3. Create DNS record deletion script
4. Create DNS record verification script

**Files to Create**:
- `shared-infrastructure/cloudflare/cloudflare-auth.sh`
- `shared-infrastructure/cloudflare/create-dns-record.sh`
- `shared-infrastructure/cloudflare/delete-dns-record.sh`
- `shared-infrastructure/cloudflare/verify-dns-record.sh`

**Script Example**:
```bash
#!/bin/bash
# shared-infrastructure/cloudflare/create-dns-record.sh

CLOUDFLARE_TOKEN="sDyuDgbhHOmmqH7xQkMwbAAnH5q5w3xbK66om5jM"
ZONE_ID="your-zone-id"
DOMAIN=$1
IP_ADDRESS="44.212.121.39"

if [ -z "$DOMAIN" ]; then
    echo "Usage: $0 <subdomain>"
    echo "Example: $0 stripe"
    exit 1
fi

# Create A record
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  -H "Authorization: Bearer $CLOUDFLARE_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "A",
    "name": "'$DOMAIN'.emitajuba.com.br",
    "content": "'$IP_ADDRESS'",
    "ttl": 300,
    "proxied": false
  }'
```

**Dependencies**: Task 1.1

---

### ✅ Task 1.5: Create Universal Deployment Scripts
**Status**: ❌ **Not Started**

**Objective**: Create deployment scripts that work for any webhook service

**Actions**:
1. Create universal service deployment script
2. Create service configuration script
3. Create service monitoring script
4. Create service backup script

**Files to Create**:
- `shared-infrastructure/scripts/deploy-service.sh`
- `shared-infrastructure/scripts/configure-service.sh`
- `shared-infrastructure/scripts/monitor-service.sh`
- `shared-infrastructure/scripts/backup-service.sh`

**Script Features**:
- Service name parameterization
- Domain and port configuration
- SSL certificate automation
- Systemd service creation
- Nginx configuration
- Health check validation

**Dependencies**: Tasks 1.1, 1.3, 1.4

---

## Phase 2: Stripe Webhook Service Implementation

### ✅ Task 2.1: Create Stripe Service Structure from Apple Template
**Status**: ❌ **Not Started**

**Objective**: Create Stripe service using Apple service as template

**Actions**:
1. Copy Apple service structure to Stripe directory
2. Update package.json for Stripe service
3. Update service name and description
4. Prepare for Stripe-specific modifications

**Commands**:
```bash
# Create Stripe service from Apple template
cp -r services/apple-webhook-receiver/* services/stripe-webhook-receiver/

# Update package.json
cd services/stripe-webhook-receiver
# Update name, description, and any Apple-specific references
```

**Deliverables**:
- Complete Stripe service structure
- Updated package.json
- Prepared for customization

**Dependencies**: Task 1.2

---

### ✅ Task 2.2: Update Stripe Configuration Module
**Status**: ❌ **Not Started**

**Objective**: Modify configuration for Stripe-specific settings

**Actions**:
1. Update `src/config/index.js` for Stripe
2. Remove Apple-specific configurations
3. Add Stripe-specific configurations
4. Update service information

**File**: `services/stripe-webhook-receiver/src/config/index.js`

**Key Changes**:
- Port: 3002
- Service name: "Stripe Webhook Receiver"
- Stripe API configuration
- Webhook secret configuration
- Remove Apple-specific URLs and settings

**Dependencies**: Task 2.1

---

### ✅ Task 2.3: Implement Stripe Authentication Service
**Status**: ❌ **Not Started**

**Objective**: Create Stripe-specific authentication and signature verification

**Actions**:
1. Update `src/auth/index.js` for Stripe
2. Implement Stripe webhook signature verification
3. Add timestamp validation for replay attack prevention
4. Remove Apple-specific JWT verification

**File**: `services/stripe-webhook-receiver/src/auth/index.js`

**Key Features**:
- Stripe webhook signature verification (HMAC-SHA256)
- Timestamp validation
- Replay attack prevention
- Error handling and logging

**Dependencies**: Task 2.2

---

### ✅ Task 2.4: Create Stripe Webhook Handlers
**Status**: ❌ **Not Started**

**Objective**: Implement Stripe-specific webhook event processing

**Actions**:
1. Update `src/handlers/webhookHandlers.js` for Stripe events
2. Implement payment event handlers
3. Implement subscription event handlers
4. Implement invoice event handlers
5. Add customer event handlers

**File**: `services/stripe-webhook-receiver/src/handlers/webhookHandlers.js`

**Stripe Events to Handle**:
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

**Dependencies**: Task 2.3

---

### ✅ Task 2.5: Update Stripe Routes and Middleware
**Status**: ❌ **Not Started**

**Objective**: Configure routes for Stripe webhook endpoints

**Actions**:
1. Update `src/routes/index.js` for Stripe endpoints
2. Configure `/webhook/stripe` endpoint
3. Update health check and root endpoints
4. Implement Stripe-specific request validation

**File**: `services/stripe-webhook-receiver/src/routes/index.js`

**Key Changes**:
- Stripe webhook endpoint: `/webhook/stripe`
- Stripe signature header validation
- Stripe-specific error responses
- Updated service information in responses

**Dependencies**: Task 2.4

---

### ✅ Task 2.6: Implement Stripe Firestore Integration
**Status**: ❌ **Not Started**

**Objective**: Create Stripe-specific Firestore collections and storage logic

**Actions**:
1. Update `src/database/firestore.js` for Stripe
2. Create Stripe-specific collections
3. Implement Stripe event storage methods
4. Add Stripe-specific data processing

**File**: `services/stripe-webhook-receiver/src/database/firestore.js`

**Firestore Collections**:
- `stripe_events`: All Stripe webhook events
- `stripe_payments`: Payment-specific data
- `stripe_subscriptions`: Subscription-specific data
- `stripe_invoices`: Invoice-specific data
- `stripe_customers`: Customer-specific data

**Dependencies**: Task 2.5

---

### ✅ Task 2.7: Create Stripe Environment Configuration
**Status**: ❌ **Not Started**

**Objective**: Create Stripe-specific environment configuration template

**Actions**:
1. Create `env.example` for Stripe service
2. Document required Stripe environment variables
3. Update deployment scripts for Stripe configuration
4. Create configuration validation

**File**: `services/stripe-webhook-receiver/env.example`

**Required Variables**:
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_API_KEY`
- `STRIPE_API_VERSION`
- `WEBHOOK_DOMAIN=stripe.emitajuba.com.br`
- `PORT=3002`

**Dependencies**: Task 2.6

---

## Phase 3: Google Play Webhook Service Implementation

### ✅ Task 3.1: Create Google Play Service Structure
**Status**: ❌ **Not Started**

**Objective**: Create Google Play service using Stripe service as template

**Actions**:
1. Copy Stripe service structure to Google Play directory
2. Update package.json for Google Play service
3. Update service name and description
4. Prepare for Google Play-specific modifications

**Commands**:
```bash
# Create Google Play service from Stripe template
cp -r services/stripe-webhook-receiver/* services/google-play-webhook-receiver/

# Update package.json
cd services/google-play-webhook-receiver
# Update name, description, and any Stripe-specific references
```

**Dependencies**: Task 2.7

---

### ✅ Task 3.2: Update Google Play Configuration Module
**Status**: ❌ **Not Started**

**Objective**: Modify configuration for Google Play-specific settings

**Actions**:
1. Update `src/config/index.js` for Google Play
2. Remove Stripe-specific configurations
3. Add Google Play-specific configurations
4. Update service information

**File**: `services/google-play-webhook-receiver/src/config/index.js`

**Key Changes**:
- Port: 3003
- Service name: "Google Play Webhook Receiver"
- Google Play package name configuration
- Pub/Sub configuration
- Service account configuration

**Dependencies**: Task 3.1

---

### ✅ Task 3.3: Implement Google Play Authentication Service
**Status**: ❌ **Not Started**

**Objective**: Create Google Play-specific authentication and verification

**Actions**:
1. Update `src/auth/index.js` for Google Play
2. Implement Google Cloud Pub/Sub message verification
3. Add Google service account authentication
4. Remove Stripe-specific verification

**File**: `services/google-play-webhook-receiver/src/auth/index.js`

**Key Features**:
- Google Cloud Pub/Sub message verification
- Service account authentication
- Google Play Developer API integration
- JWT token validation for Google services

**Dependencies**: Task 3.2

---

### ✅ Task 3.4: Create Google Play Webhook Handlers
**Status**: ❌ **Not Started**

**Objective**: Implement Google Play-specific webhook event processing

**Actions**:
1. Update `src/handlers/webhookHandlers.js` for Google Play events
2. Implement subscription event handlers
3. Implement purchase event handlers
4. Add product event handlers

**File**: `services/google-play-webhook-receiver/src/handlers/webhookHandlers.js`

**Google Play Events to Handle**:
- Subscription notifications
- One-time product purchase notifications
- Test purchase notifications
- Subscription state changes
- Purchase acknowledgments

**Dependencies**: Task 3.3

---

### ✅ Task 3.5: Update Google Play Routes and Middleware
**Status**: ❌ **Not Started**

**Objective**: Configure routes for Google Play webhook endpoints

**Actions**:
1. Update `src/routes/index.js` for Google Play endpoints
2. Configure `/webhook/google-play` endpoint
3. Update health check and root endpoints
4. Implement Google Play-specific request validation

**File**: `services/google-play-webhook-receiver/src/routes/index.js`

**Key Changes**:
- Google Play webhook endpoint: `/webhook/google-play`
- Pub/Sub message format handling
- Google Play-specific error responses
- Updated service information

**Dependencies**: Task 3.4

---

### ✅ Task 3.6: Implement Google Play Firestore Integration
**Status**: ❌ **Not Started**

**Objective**: Create Google Play-specific Firestore collections and storage logic

**Actions**:
1. Update `src/database/firestore.js` for Google Play
2. Create Google Play-specific collections
3. Implement Google Play event storage methods
4. Add Google Play-specific data processing

**File**: `services/google-play-webhook-receiver/src/database/firestore.js`

**Firestore Collections**:
- `google_play_events`: All Google Play webhook events
- `google_play_purchases`: Purchase-specific data
- `google_play_subscriptions`: Subscription-specific data
- `google_play_products`: Product-specific data

**Dependencies**: Task 3.5

---

### ✅ Task 3.7: Create Google Play Environment Configuration
**Status**: ❌ **Not Started**

**Objective**: Create Google Play-specific environment configuration template

**Actions**:
1. Create `env.example` for Google Play service
2. Document required Google Play environment variables
3. Update deployment scripts for Google Play configuration
4. Create configuration validation

**File**: `services/google-play-webhook-receiver/env.example`

**Required Variables**:
- `GOOGLE_PLAY_PACKAGE_NAME`
- `GOOGLE_PLAY_SERVICE_ACCOUNT_KEY_PATH`
- `GOOGLE_PLAY_PUBSUB_TOPIC`
- `WEBHOOK_DOMAIN=googleplay.emitajuba.com.br`
- `PORT=3003`

**Dependencies**: Task 3.6

---

## Phase 4: Shared Infrastructure Components

### ✅ Task 4.1: Create Shared Firestore Base Service
**Status**: ❌ **Not Started**

**Objective**: Create reusable Firestore utilities for all services

**Actions**:
1. Create base Firestore service class
2. Implement common database operations
3. Create shared retry logic
4. Add shared error handling

**File**: `shared-infrastructure/firestore/base-service.js`

**Features**:
- Common initialization patterns
- Shared retry logic with exponential backoff
- Error logging and monitoring
- Connection management

**Dependencies**: Tasks 2.6, 3.6

---

### ✅ Task 4.2: Create Shared Monitoring Utilities
**Status**: ❌ **Not Started**

**Objective**: Create reusable monitoring and health check utilities

**Actions**:
1. Create health check service class
2. Create monitoring dashboard utilities
3. Add performance tracking
4. Implement alerting helpers

**Files**:
- `shared-infrastructure/monitoring/health-check.js`
- `shared-infrastructure/monitoring/metrics.js`
- `shared-infrastructure/monitoring/alerts.js`

**Features**:
- Standardized health check responses
- Service uptime tracking
- Error rate monitoring
- Performance metrics collection

**Dependencies**: Phase 2 and 3 completion

---

### ✅ Task 4.3: Create Shared Security Patterns
**Status**: ❌ **Not Started**

**Objective**: Create reusable security utilities and patterns

**Actions**:
1. Create common security middleware
2. Implement shared validation patterns
3. Add rate limiting utilities
4. Create security header helpers

**Files**:
- `shared-infrastructure/security/middleware.js`
- `shared-infrastructure/security/validation.js`
- `shared-infrastructure/security/rate-limiting.js`

**Features**:
- Common security headers
- Request validation patterns
- Rate limiting implementations
- Security logging

**Dependencies**: Phase 2 and 3 completion

---

### ✅ Task 4.4: Create Shared Error Handling Middleware
**Status**: ❌ **Not Started**

**Objective**: Create standardized error handling across all services

**Actions**:
1. Create common error handling middleware
2. Implement standardized error responses
3. Add error logging patterns
4. Create error classification system

**File**: `shared-infrastructure/middleware/error-handler.js`

**Features**:
- Consistent error response format
- Error classification and logging
- Development vs production error details
- Error tracking integration

**Dependencies**: Phase 2 and 3 completion

---

### ✅ Task 4.5: Create Shared Configuration Validation
**Status**: ❌ **Not Started**

**Objective**: Create reusable configuration validation utilities

**Actions**:
1. Create configuration validation helpers
2. Implement environment variable validation
3. Add configuration documentation generators
4. Create configuration testing utilities

**File**: `shared-infrastructure/config/validation.js`

**Features**:
- Environment variable validation
- Configuration schema validation
- Missing configuration detection
- Configuration documentation generation

**Dependencies**: Phase 2 and 3 completion

---

## Phase 5: Deployment and Domain Configuration

### ✅ Task 5.1: Deploy Stripe Service to EC2
**Status**: ❌ **Not Started**

**Objective**: Deploy the Stripe webhook service to EC2 instance

**Actions**:
1. Use universal deployment script for Stripe service
2. Configure environment variables
3. Set up systemd service
4. Verify service startup

**Commands**:
```bash
# Deploy Stripe service
./shared-infrastructure/scripts/deploy-service.sh stripe-webhook-receiver stripe.emitajuba.com.br 3002
```

**Verification**:
- Service running on port 3002
- Health endpoint responding
- Systemd service active
- Logs showing successful startup

**Dependencies**: Tasks 1.5, 2.7

---

### ✅ Task 5.2: Configure Stripe Subdomain via Cloudflare API
**Status**: ❌ **Not Started**

**Objective**: Create DNS A record for stripe.emitajuba.com.br

**Actions**:
1. Use Cloudflare API script to create DNS record
2. Verify DNS propagation
3. Test domain resolution
4. Update deployment documentation

**Commands**:
```bash
# Create DNS record for Stripe
./shared-infrastructure/cloudflare/create-dns-record.sh stripe

# Verify DNS record
./shared-infrastructure/cloudflare/verify-dns-record.sh stripe.emitajuba.com.br
```

**Verification**:
- DNS record created successfully
- Domain resolves to 44.212.121.39
- HTTP requests reach the service

**Dependencies**: Tasks 1.4, 5.1

---

### ✅ Task 5.3: Deploy Google Play Service to EC2
**Status**: ❌ **Not Started**

**Objective**: Deploy the Google Play webhook service to EC2 instance

**Actions**:
1. Use universal deployment script for Google Play service
2. Configure environment variables
3. Set up systemd service
4. Verify service startup

**Commands**:
```bash
# Deploy Google Play service
./shared-infrastructure/scripts/deploy-service.sh google-play-webhook-receiver googleplay.emitajuba.com.br 3003
```

**Verification**:
- Service running on port 3003
- Health endpoint responding
- Systemd service active
- Logs showing successful startup

**Dependencies**: Tasks 1.5, 3.7

---

### ✅ Task 5.4: Configure Google Play Subdomain via Cloudflare API
**Status**: ❌ **Not Started**

**Objective**: Create DNS A record for googleplay.emitajuba.com.br

**Actions**:
1. Use Cloudflare API script to create DNS record
2. Verify DNS propagation
3. Test domain resolution
4. Update deployment documentation

**Commands**:
```bash
# Create DNS record for Google Play
./shared-infrastructure/cloudflare/create-dns-record.sh googleplay

# Verify DNS record
./shared-infrastructure/cloudflare/verify-dns-record.sh googleplay.emitajuba.com.br
```

**Verification**:
- DNS record created successfully
- Domain resolves to 44.212.121.39
- HTTP requests reach the service

**Dependencies**: Tasks 1.4, 5.3

---

### ✅ Task 5.5: Set Up SSL Certificates for All Services
**Status**: ❌ **Not Started**

**Objective**: Configure SSL certificates for all webhook services

**Actions**:
1. Generate SSL certificates for all domains
2. Configure nginx with SSL
3. Set up automatic renewal
4. Test HTTPS endpoints

**Commands**:
```bash
# Set up SSL for all services
sudo certbot --nginx -d apple.emitajuba.com.br -d stripe.emitajuba.com.br -d googleplay.emitajuba.com.br

# Test auto-renewal
sudo certbot renew --dry-run
```

**Verification**:
- All domains have valid SSL certificates
- HTTPS endpoints responding correctly
- HTTP redirects to HTTPS
- Auto-renewal configured

**Dependencies**: Tasks 5.2, 5.4

---

### ✅ Task 5.6: Configure Nginx for All Services
**Status**: ❌ **Not Started**

**Objective**: Configure nginx reverse proxy for all services

**Actions**:
1. Apply nginx configurations for all services
2. Configure load balancing if needed
3. Set up security headers
4. Test proxy configurations

**Verification**:
- All services accessible via their domains
- Proper proxy headers set
- Security headers applied
- Load balancing working (if configured)

**Dependencies**: Task 5.5

---

## Phase 6: Testing and Validation

### ✅ Task 6.1: Create Comprehensive Testing Scripts
**Status**: ❌ **Not Started**

**Objective**: Create automated testing scripts for all services

**Actions**:
1. Create health check testing script
2. Create webhook endpoint testing script
3. Create load testing script
4. Create integration testing script

**Files**:
- `shared-infrastructure/scripts/test-all-services.sh`
- `shared-infrastructure/scripts/test-webhooks.sh`
- `shared-infrastructure/scripts/load-test.sh`

**Features**:
- Automated health checks for all services
- Mock webhook payload testing
- Performance and load testing
- Integration testing with Firestore

**Dependencies**: Phase 5 completion

---

### ✅ Task 6.2: Test All Service Health Endpoints
**Status**: ❌ **Not Started**

**Objective**: Verify all services are responding correctly

**Actions**:
1. Test Apple service health endpoint
2. Test Stripe service health endpoint
3. Test Google Play service health endpoint
4. Verify response formats and content

**Commands**:
```bash
# Test all health endpoints
./shared-infrastructure/scripts/test-all-services.sh
```

**Expected Results**:
- All services return 200 OK
- Proper service identification in responses
- Consistent response format
- Appropriate uptime information

**Dependencies**: Task 6.1

---

### ✅ Task 6.3: Test Webhook Endpoints with Mock Data
**Status**: ❌ **Not Started**

**Objective**: Test webhook endpoints with provider-specific mock data

**Actions**:
1. Create mock Apple webhook payloads
2. Create mock Stripe webhook payloads
3. Create mock Google Play webhook payloads
4. Test signature verification for each provider
5. Test error handling scenarios

**Test Scenarios**:
- Valid webhook payloads
- Invalid signatures
- Malformed payloads
- Missing headers
- Rate limiting

**Dependencies**: Task 6.2

---

### ✅ Task 6.4: Validate Firestore Integration for All Services
**Status**: ❌ **Not Started**

**Objective**: Verify Firestore storage is working for all services

**Actions**:
1. Test Firestore connection for each service
2. Verify data storage for webhook events
3. Test retry logic and error handling
4. Validate collection schemas

**Verification**:
- Events stored in correct collections
- Proper metadata tracking
- Retry logic functioning
- Error logging working

**Dependencies**: Task 6.3

---

### ✅ Task 6.5: Test Cloudflare DNS Management
**Status**: ❌ **Not Started**

**Objective**: Verify Cloudflare API integration is working

**Actions**:
1. Test DNS record creation
2. Test DNS record deletion
3. Test DNS record verification
4. Validate API authentication

**Commands**:
```bash
# Test DNS management
./shared-infrastructure/cloudflare/create-dns-record.sh test
./shared-infrastructure/cloudflare/verify-dns-record.sh test.emitajuba.com.br
./shared-infrastructure/cloudflare/delete-dns-record.sh test.emitajuba.com.br
```

**Dependencies**: Task 6.4

---

## Phase 7: Documentation and Monitoring

### ✅ Task 7.1: Create Main Infrastructure Documentation
**Status**: ❌ **Not Started**

**Objective**: Create comprehensive documentation for the multi-provider infrastructure

**Actions**:
1. Create main README.md for infrastructure
2. Document architecture and design decisions
3. Create quick start guide
4. Document service management procedures

**Files**:
- `README.md` (main infrastructure)
- `docs/ARCHITECTURE_OVERVIEW.md`
- `docs/QUICK_START_GUIDE.md`
- `docs/SERVICE_MANAGEMENT.md`

**Content**:
- Service overview and endpoints
- Architecture diagrams
- Deployment procedures
- Monitoring and maintenance

**Dependencies**: Phase 6 completion

---

### ✅ Task 7.2: Create Service-Specific Documentation
**Status**: ❌ **Not Started**

**Objective**: Create detailed documentation for each service

**Actions**:
1. Create Stripe service documentation
2. Create Google Play service documentation
3. Update Apple service documentation
4. Create troubleshooting guides

**Files**:
- `docs/STRIPE_INTEGRATION_GUIDE.md`
- `docs/GOOGLE_PLAY_INTEGRATION_GUIDE.md`
- `services/apple-webhook-receiver/README.md` (updated)
- `services/stripe-webhook-receiver/README.md`
- `services/google-play-webhook-receiver/README.md`

**Content**:
- Service-specific configuration
- Webhook event types and handling
- Firestore schema documentation
- Testing and validation procedures

**Dependencies**: Task 7.1

---

### ✅ Task 7.3: Set Up Monitoring and Alerting
**Status**: ❌ **Not Started**

**Objective**: Implement comprehensive monitoring for all services

**Actions**:
1. Set up service health monitoring
2. Configure error rate alerting
3. Set up performance monitoring
4. Create monitoring dashboard

**Files**:
- `shared-infrastructure/monitoring/setup-monitoring.sh`
- `shared-infrastructure/monitoring/alerts-config.json`
- `shared-infrastructure/monitoring/dashboard-config.json`

**Features**:
- Real-time health monitoring
- Error rate and performance alerts
- Service uptime tracking
- Resource usage monitoring

**Dependencies**: Task 7.2

---

### ✅ Task 7.4: Create Maintenance Scripts
**Status**: ❌ **Not Started**

**Objective**: Create scripts for ongoing maintenance and operations

**Actions**:
1. Create service restart scripts
2. Create log rotation scripts
3. Create backup scripts
4. Create update scripts

**Files**:
- `shared-infrastructure/scripts/restart-all-services.sh`
- `shared-infrastructure/scripts/rotate-logs.sh`
- `shared-infrastructure/scripts/backup-services.sh`
- `shared-infrastructure/scripts/update-services.sh`

**Features**:
- Automated service management
- Log management and rotation
- Configuration backup and restore
- Automated updates and deployments

**Dependencies**: Task 7.3

---

### ✅ Task 7.5: Update Deployment Guides
**Status**: ❌ **Not Started**

**Objective**: Update all deployment documentation to reflect the new infrastructure

**Actions**:
1. Update main deployment guide
2. Create service-specific deployment guides
3. Document rollback procedures
4. Create troubleshooting guides

**Files**:
- `docs/DEPLOYMENT_GUIDE.md` (updated)
- `docs/ROLLBACK_PROCEDURES.md`
- `docs/TROUBLESHOOTING_GUIDE.md`
- `docs/MAINTENANCE_PROCEDURES.md`

**Content**:
- Step-by-step deployment procedures
- Emergency rollback procedures
- Common issues and solutions
- Maintenance schedules and procedures

**Dependencies**: Task 7.4

---

## 🔧 Technical Specifications

### Server Configuration
- **Instance**: AWS EC2 t4g.small (Ubuntu 22.04) at 44.212.121.39
- **Runtime**: Node.js 20+
- **Reverse Proxy**: Nginx with SSL
- **SSL**: Let's Encrypt certificates

### Port Allocation
- **Apple**: 3001 (existing)
- **Stripe**: 3002 (new)
- **Google Play**: 3003 (new)

### Domain Configuration
- **Apple**: apple.emitajuba.com.br (existing)
- **Stripe**: stripe.emitajuba.com.br (new)
- **Google Play**: googleplay.emitajuba.com.br (new)

### Firestore Collections

#### Apple (Existing)
- `webhook_events`
- `server_notifications`
- `purchase_events`
- `app_version_events`
- `testflight_feedback`

#### Stripe (New)
- `stripe_events`
- `stripe_payments`
- `stripe_subscriptions`
- `stripe_invoices`
- `stripe_customers`

#### Google Play (New)
- `google_play_events`
- `google_play_purchases`
- `google_play_subscriptions`
- `google_play_products`

#### Shared
- `failed_storage_attempts`

## 🚀 Success Criteria

### Functional Requirements
- [ ] All three services deployed and running
- [ ] All domains configured and accessible via HTTPS
- [ ] All webhook endpoints accepting and processing events
- [ ] All events stored in appropriate Firestore collections
- [ ] Error handling and retry logic working correctly

### Non-Functional Requirements
- [ ] Services isolated and independently scalable
- [ ] Shared infrastructure reducing code duplication
- [ ] Comprehensive monitoring and alerting
- [ ] Complete documentation and maintenance procedures
- [ ] Automated deployment and configuration management

### Security Requirements
- [ ] Provider-specific signature verification
- [ ] HTTPS enforcement for all endpoints
- [ ] Proper secret management and rotation
- [ ] Rate limiting and abuse prevention
- [ ] Audit logging for all webhook events

## 📞 Support and Maintenance

### Daily Operations
- Monitor service health via automated scripts
- Review error logs and failed storage attempts
- Verify SSL certificate status
- Check resource usage and performance metrics

### Weekly Operations
- Review Firestore storage usage and costs
- Analyze webhook event patterns and volumes
- Update documentation based on operational learnings
- Test backup and recovery procedures

### Monthly Operations
- Rotate webhook secrets and API keys
- Review and update security configurations
- Analyze performance trends and optimization opportunities
- Update dependencies and security patches

---

**Status**: 📋 **PLANNING COMPLETE** - Ready for execution by AI agent

**Next Action**: Begin execution with Task 1.1 - Create Project Directory Structure

**Estimated Completion**: 7-10 days for full implementation and testing 