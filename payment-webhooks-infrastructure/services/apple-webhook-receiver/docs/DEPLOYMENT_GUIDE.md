# Deployment Guide for Refactored Webhook Receiver

## Overview

This guide covers deploying the refactored Apple App Store Connect Webhook Receiver with its new modular architecture to your AWS EC2 instance.

## Prerequisites

- AWS EC2 instance running Ubuntu 22.04 LTS
- Node.js 20+ installed on the server
- SSH access to the server
- Domain name configured (optional but recommended)

## Deployment Steps

### 1. Prepare Local Files

Ensure you have the following files ready for deployment:

```
├── src/                           # Modular source code
│   ├── app.js                    # Main application
│   ├── config/index.js           # Configuration
│   ├── auth/index.js             # Authentication
│   ├── database/firestore.js     # Database operations
│   ├── services/appleApi.js      # Apple API service
│   ├── handlers/webhookHandlers.js # Event handlers
│   ├── middleware/index.js       # Express middleware
│   └── routes/index.js           # API routes
├── package.json                   # Dependencies
├── env.example                    # Environment template
├── deploy-with-test-notifications.sh # Deployment script
└── README.md                      # Documentation
```

### 2. Deploy to Server

#### Option A: Automated Deployment (Recommended)

```bash
# Make deployment script executable
chmod +x deploy-with-test-notifications.sh

# Run deployment (replace with your server IP)
./deploy-with-test-notifications.sh
```

#### Option B: Manual Deployment

If the automated deployment fails, follow these manual steps:

```bash
# 1. Copy files to server
scp -r src/ package.json env.example README.md ubuntu@44.212.121.39:~/

# 2. SSH to server
ssh ubuntu@44.212.121.39

# 3. Stop existing service (if running)
sudo systemctl stop webhook-receiver || true

# 4. Create application directory
sudo mkdir -p /opt/webhook-receiver

# 5. Move files to application directory
sudo mv ~/src /opt/webhook-receiver/
sudo mv ~/package.json /opt/webhook-receiver/
sudo mv ~/README.md /opt/webhook-receiver/

# 6. Set up environment file
if [ ! -f /opt/webhook-receiver/.env ]; then
    sudo mv ~/env.example /opt/webhook-receiver/.env
    echo "Created .env file from example"
else
    echo "Using existing .env file"
    rm -f ~/env.example
fi

# 7. Set ownership and permissions
sudo chown -R ubuntu:ubuntu /opt/webhook-receiver
sudo chmod +x /opt/webhook-receiver/src/app.js

# 8. Install dependencies
cd /opt/webhook-receiver
npm install

# 9. Create systemd service file
sudo tee /etc/systemd/system/webhook-receiver.service > /dev/null << 'EOF'
[Unit]
Description=Apple App Store Connect Webhook Receiver
After=network.target

[Service]
Type=simple
User=ubuntu
Group=ubuntu
WorkingDirectory=/opt/webhook-receiver
ExecStart=/usr/bin/node src/app.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=/opt/webhook-receiver/.env

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=webhook-receiver

[Install]
WantedBy=multi-user.target
EOF

# 10. Reload systemd and start service
sudo systemctl daemon-reload
sudo systemctl enable webhook-receiver
sudo systemctl start webhook-receiver

# 11. Check service status
sudo systemctl status webhook-receiver
```

### 3. Configure Environment Variables

Edit the environment file with your specific configuration:

```bash
sudo nano /opt/webhook-receiver/.env
```

Required environment variables:

```bash
# Server Configuration
NODE_ENV=production
PORT=3001

# Apple App Store Connect
APP_STORE_WEBHOOK_SECRET=your-webhook-secret-here
APP_STORE_BUNDLE_ID=com.yourcompany.yourapp

# App Store Server API (for test notifications)
APP_STORE_SERVER_API_KEY_ID=your-key-id
APP_STORE_SERVER_API_ISSUER_ID=your-issuer-id
APP_STORE_SERVER_API_PRIVATE_KEY_PATH=/opt/webhook-receiver/AuthKey_XXXXXXXXXX.p8

# Firestore Configuration
FIRESTORE_ENABLED=true
FIREBASE_PROJECT_ID=your-firebase-project-id
GOOGLE_APPLICATION_CREDENTIALS=/opt/webhook-receiver/service-account-key.json
```

### 4. Upload Private Keys (if using test notifications)

```bash
# Upload App Store Connect API private key
scp AuthKey_XXXXXXXXXX.p8 ubuntu@44.212.121.39:/opt/webhook-receiver/

# Upload Firebase service account key
scp service-account-key.json ubuntu@44.212.121.39:/opt/webhook-receiver/

# Set proper permissions
ssh ubuntu@44.212.121.39 'sudo chmod 600 /opt/webhook-receiver/AuthKey_*.p8'
ssh ubuntu@44.212.121.39 'sudo chmod 600 /opt/webhook-receiver/service-account-key.json'
```

### 5. Restart Service

After configuration changes:

```bash
ssh ubuntu@44.212.121.39 'sudo systemctl restart webhook-receiver'
```

### 6. Verify Deployment

Check service status:

```bash
ssh ubuntu@44.212.121.39 'sudo systemctl status webhook-receiver'
```

Test endpoints:

```bash
# Health check
curl http://44.212.121.39:3001/health

# Root endpoint
curl http://44.212.121.39:3001/

# Test notification (if configured)
curl -X POST http://44.212.121.39:3001/test/request-notification
```

## Troubleshooting

### Service Won't Start

```bash
# Check logs
sudo journalctl -u webhook-receiver -n 50

# Check for missing dependencies
cd /opt/webhook-receiver && npm install

# Check file permissions
ls -la /opt/webhook-receiver/src/app.js
```

### Port Already in Use

```bash
# Check what's using port 3001
sudo lsof -i :3001

# Kill process if needed
sudo kill -9 <PID>
```

### Missing Dependencies

```bash
# Reinstall dependencies
cd /opt/webhook-receiver
rm -rf node_modules package-lock.json
npm install
```

### Configuration Issues

```bash
# Check environment file
sudo cat /opt/webhook-receiver/.env

# Validate configuration
cd /opt/webhook-receiver
node -e "console.log(require('./src/config'))"
```

## Post-Deployment Configuration

### 1. Set up Nginx (if not already configured)

```bash
# Install nginx
sudo apt update
sudo apt install nginx

# Copy nginx configuration
sudo tee /etc/nginx/sites-available/webhook-receiver > /dev/null << 'EOF'
server {
    listen 80;
    server_name webhook.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/webhook-receiver /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 2. Set up SSL with Let's Encrypt

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d webhook.yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

### 3. Configure Apple App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to Users and Access → Integrations → Webhooks
3. Create a new webhook:
   - **Name**: Your app webhook
   - **Payload URL**: `https://webhook.yourdomain.com/webhook/app-store-connect`
   - **Secret**: Same as configured in `.env`
   - **Events**: Select desired event types

## Monitoring

### Service Logs

```bash
# Real-time logs
sudo journalctl -u webhook-receiver -f

# Recent logs
sudo journalctl -u webhook-receiver -n 100

# Error logs only
sudo journalctl -u webhook-receiver -p err
```

### Health Monitoring

```bash
# Create health check script
cat > /opt/webhook-receiver/health-check.sh << 'EOF'
#!/bin/bash
HEALTH_URL="http://localhost:3001/health"
if curl -s "$HEALTH_URL" | grep -q "healthy"; then
    echo "$(date): Service is healthy"
else
    echo "$(date): Service is unhealthy"
    sudo systemctl restart webhook-receiver
fi
EOF

chmod +x /opt/webhook-receiver/health-check.sh

# Add to crontab for periodic health checks
(crontab -l 2>/dev/null; echo "*/5 * * * * /opt/webhook-receiver/health-check.sh >> /var/log/webhook-health.log") | crontab -
```

## Benefits of the New Architecture

1. **Modular Design**: Each component has a single responsibility
2. **Better Testing**: Individual modules can be tested in isolation
3. **Easier Maintenance**: Changes to one module don't affect others
4. **Scalability**: Easy to add new features or modify existing ones
5. **Error Handling**: Centralized error handling and logging
6. **Configuration Management**: All settings in one place

## File Structure on Server

After deployment, your server will have:

```
/opt/webhook-receiver/
├── src/                           # Modular source code
│   ├── app.js                    # Main application
│   ├── config/index.js           # Configuration
│   ├── auth/index.js             # Authentication
│   ├── database/firestore.js     # Database operations
│   ├── services/appleApi.js      # Apple API service
│   ├── handlers/webhookHandlers.js # Event handlers
│   ├── middleware/index.js       # Express middleware
│   └── routes/index.js           # API routes
├── node_modules/                  # Dependencies
├── package.json                   # Package configuration
├── .env                          # Environment variables
├── AuthKey_XXXXXXXXXX.p8         # App Store Connect API key
├── service-account-key.json      # Firebase service account
└── README.md                     # Documentation
```

## Support

If you encounter issues:

1. Check the service logs: `sudo journalctl -u webhook-receiver -f`
2. Verify configuration: `sudo cat /opt/webhook-receiver/.env`
3. Test endpoints manually: `curl http://localhost:3001/health`
4. Check file permissions: `ls -la /opt/webhook-receiver/src/`
5. Restart the service: `sudo systemctl restart webhook-receiver` 