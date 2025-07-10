#!/bin/bash

# Deploy script for Apple App Store Connect Webhook Receiver on EC2

set -e

echo "🚀 Deploying Apple App Store Connect Webhook Receiver..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root. Please run as ubuntu user."
   exit 1
fi

# Update system
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 20+
print_status "Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify Node.js installation
NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
print_status "Node.js version: $NODE_VERSION"
print_status "NPM version: $NPM_VERSION"

# Create app directory
APP_DIR="/opt/webhook-receiver"
print_status "Creating application directory: $APP_DIR"
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR

# Copy application files
print_status "Copying application files..."
cp webhook-receiver.js $APP_DIR/
cp package.json $APP_DIR/
cd $APP_DIR

# Install dependencies
echo "Installing dependencies..."
npm install

# Install firebase-admin for Firestore integration
echo "Installing Firebase Admin SDK..."
npm install firebase-admin

# Create environment file from template
print_status "Creating environment file from template..."
if [[ -f "/home/ubuntu/env.example" ]]; then
    cp /home/ubuntu/env.example .env
else
    cat > .env << EOF
NODE_ENV=production
PORT=3001
# APP_STORE_WEBHOOK_SECRET=your-webhook-secret-here
# WEBHOOK_DOMAIN=webhook.yourdomain.com
# ADMIN_EMAIL=admin@yourdomain.com
EOF
fi

# Secure the environment file
chmod 600 .env

# Create systemd service
print_status "Creating systemd service..."
sudo tee /etc/systemd/system/webhook-receiver.service > /dev/null <<EOF
[Unit]
Description=Apple App Store Connect Webhook Receiver
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
Environment=PORT=3001
EnvironmentFile=$APP_DIR/.env
ExecStart=/usr/bin/node webhook-receiver.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
print_status "Enabling and starting webhook receiver service..."
sudo systemctl daemon-reload
sudo systemctl enable webhook-receiver
sudo systemctl start webhook-receiver

# Wait a moment for service to start
sleep 3

# Check service status
if sudo systemctl is-active --quiet webhook-receiver; then
    print_status "✅ Webhook receiver service is running!"
else
    print_error "❌ Webhook receiver service failed to start"
    sudo systemctl status webhook-receiver
    exit 1
fi

# Test the service
print_status "Testing webhook receiver..."
if curl -s http://localhost:3001/health > /dev/null; then
    print_status "✅ Health check passed!"
else
    print_warning "Health check failed - service may still be starting"
fi

# Show service status
print_status "Service status:"
sudo systemctl status webhook-receiver --no-pager

# Show logs
print_status "Recent logs:"
sudo journalctl -u webhook-receiver --no-pager -n 10

print_status "🎉 Deployment complete!"
echo ""
echo "📋 Service Information:"
echo "  - Service name: webhook-receiver"
echo "  - Port: 3001"
echo "  - Health check: http://localhost:3001/health"
echo "  - Webhook endpoint: http://localhost:3001/webhook/app-store-connect"
echo "  - Application directory: $APP_DIR"
echo ""
echo "🔧 Management commands:"
echo "  - Start: sudo systemctl start webhook-receiver"
echo "  - Stop: sudo systemctl stop webhook-receiver"
echo "  - Restart: sudo systemctl restart webhook-receiver"
echo "  - Status: sudo systemctl status webhook-receiver"
echo "  - Logs: sudo journalctl -u webhook-receiver -f"
echo ""
echo "⚠️  Next steps:"
echo "  1. Configure nginx reverse proxy"
echo "  2. Set up SSL with certbot"
echo "  3. Configure webhook secret in .env file"
echo "  4. Set up webhook URL in App Store Connect" 