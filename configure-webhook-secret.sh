#!/bin/bash

# Secure Webhook Secret Configuration Script
# This script generates a secure webhook secret and configures it properly

set -e

echo "🔐 Configuring Apple App Store Connect Webhook Secret"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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

# Check if openssl is available
if ! command -v openssl &> /dev/null; then
    print_error "OpenSSL is required but not installed. Installing..."
    sudo apt update && sudo apt install -y openssl
fi

# Generate a secure webhook secret
print_status "Generating secure webhook secret..."
WEBHOOK_SECRET=$(openssl rand -hex 32)

print_status "Generated webhook secret: $WEBHOOK_SECRET"

# Check if .env file exists
ENV_FILE="/opt/webhook-receiver/.env"
if [[ ! -f "$ENV_FILE" ]]; then
    print_status "Creating .env file..."
    sudo cp /home/ubuntu/env.example "$ENV_FILE"
    sudo chown ubuntu:ubuntu "$ENV_FILE"
    sudo chmod 600 "$ENV_FILE"
fi

# Update the webhook secret in .env file
print_status "Updating webhook secret in .env file..."
if grep -q "APP_STORE_WEBHOOK_SECRET=" "$ENV_FILE"; then
    # Replace existing secret (handle both commented and uncommented)
    sudo sed -i "s/^#*APP_STORE_WEBHOOK_SECRET=.*/APP_STORE_WEBHOOK_SECRET=$WEBHOOK_SECRET/" "$ENV_FILE"
else
    # Add new secret
    echo "APP_STORE_WEBHOOK_SECRET=$WEBHOOK_SECRET" | sudo tee -a "$ENV_FILE" > /dev/null
fi

# Secure the .env file
sudo chown ubuntu:ubuntu "$ENV_FILE"
sudo chmod 600 "$ENV_FILE"

# Restart the webhook receiver service
print_status "Restarting webhook receiver service..."
sudo systemctl restart webhook-receiver

# Wait for service to start
sleep 2

# Check service status
if sudo systemctl is-active --quiet webhook-receiver; then
    print_status "✅ Webhook receiver service restarted successfully"
else
    print_error "❌ Webhook receiver service failed to restart"
    sudo systemctl status webhook-receiver
    exit 1
fi

# Test the service
print_status "Testing webhook receiver..."
if curl -s http://localhost:3001/health > /dev/null; then
    print_status "✅ Webhook receiver is responding"
else
    print_error "❌ Webhook receiver is not responding"
    exit 1
fi

print_status "🎉 Webhook secret configured successfully!"
echo ""
echo "📋 Next Steps:"
echo "1. Copy this webhook secret to configure in Apple App Store Connect:"
echo ""
echo "   🔑 WEBHOOK SECRET: $WEBHOOK_SECRET"
echo ""
echo "2. In App Store Connect, create a webhook with:"
echo "   - Name: Your webhook name"
echo "   - Payload URL: https://your-domain.com/webhook/app-store-connect"
echo "   - Secret: $WEBHOOK_SECRET"
echo "   - App: Select your app"
echo "   - Event Types: Choose the events you want"
echo ""
echo "3. Test the webhook using the 'Test' button in App Store Connect"
echo ""
echo "⚠️  Security Notes:"
echo "- This secret is stored securely in $ENV_FILE (permissions: 600)"
echo "- Never share this secret publicly"
echo "- Consider rotating this secret periodically"
echo "- The secret is required for webhook signature verification"
echo ""
echo "🔧 Verification:"
echo "- Service status: sudo systemctl status webhook-receiver"
echo "- View logs: sudo journalctl -u webhook-receiver -f"
echo "- Test endpoint: curl https://your-domain.com/health" 