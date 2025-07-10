#!/bin/bash

# Setup script for Apple App Store Connect Webhook Receiver - Nginx Configuration

set -e

echo "🔧 Setting up Nginx configuration for Apple App Store Connect Webhook Receiver"

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

# Load environment variables if .env exists
if [[ -f "/opt/webhook-receiver/.env" ]]; then
    source /opt/webhook-receiver/.env
fi

# Get domain name (from env or prompt)
if [[ -n "$WEBHOOK_DOMAIN" ]]; then
    DOMAIN="$WEBHOOK_DOMAIN"
    print_status "Using domain from environment: $DOMAIN"
else
    echo "Enter your domain name for the webhook receiver (e.g., webhook.yourdomain.com):"
    read -r DOMAIN
    
    if [[ -z "$DOMAIN" ]]; then
        print_error "Domain name is required!"
        exit 1
    fi
fi

print_status "Using domain: $DOMAIN"

# Create nginx configuration
print_status "Creating nginx configuration for $DOMAIN..."
sudo cp webhook-receiver.nginx.conf /etc/nginx/conf.d/webhook-receiver.conf

# Replace domain placeholder
sudo sed -i "s/webhook.yourdomain.com/$DOMAIN/g" /etc/nginx/conf.d/webhook-receiver.conf

# Test nginx configuration
print_status "Testing nginx configuration..."
if sudo nginx -t; then
    print_status "✅ Nginx configuration is valid"
else
    print_error "❌ Nginx configuration is invalid"
    exit 1
fi

# Reload nginx
print_status "Reloading nginx..."
sudo systemctl reload nginx

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
    print_status "Installing certbot..."
    sudo apt update
    sudo apt install -y certbot python3-certbot-nginx
fi

# Create directory for Let's Encrypt challenges
sudo mkdir -p /var/www/html

# Test HTTP access
print_status "Testing HTTP access..."
if curl -s http://localhost/health > /dev/null; then
    print_status "✅ HTTP access working"
else
    print_warning "⚠️ HTTP access test failed - this might be normal if using a different port"
fi

# Ask if user wants to set up SSL
echo ""
echo "Do you want to set up SSL with Let's Encrypt? (y/n)"
read -r SETUP_SSL

if [[ "$SETUP_SSL" =~ ^[Yy]$ ]]; then
    print_status "Setting up SSL certificate with Let's Encrypt..."
    
    # Get admin email (from env or use default)
    EMAIL="${ADMIN_EMAIL:-admin@$DOMAIN}"
    
    # Run certbot
    if sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "$EMAIL"; then
        print_status "✅ SSL certificate installed successfully"
        
        # Uncomment HTTPS configuration
        print_status "Enabling HTTPS configuration..."
        sudo sed -i 's/^# server {/server {/' /etc/nginx/conf.d/webhook-receiver.conf
        sudo sed -i 's/^#     /    /' /etc/nginx/conf.d/webhook-receiver.conf
        sudo sed -i 's/^# }/}/' /etc/nginx/conf.d/webhook-receiver.conf
        
        # Update SSL paths in configuration
        sudo sed -i "s|/etc/letsencrypt/live/webhook.yourdomain.com/|/etc/letsencrypt/live/$DOMAIN/|g" /etc/nginx/conf.d/webhook-receiver.conf
        
        # Test and reload nginx
        if sudo nginx -t; then
            sudo systemctl reload nginx
            print_status "✅ HTTPS configuration enabled"
        else
            print_error "❌ HTTPS configuration failed"
            exit 1
        fi
    else
        print_error "❌ SSL certificate installation failed"
        print_warning "You can run certbot manually later: sudo certbot --nginx -d $DOMAIN"
    fi
else
    print_warning "Skipping SSL setup. You can run this script again later to set up SSL."
fi

# Test the webhook receiver
print_status "Testing webhook receiver..."
if curl -s http://localhost:3001/health > /dev/null; then
    print_status "✅ Webhook receiver is responding"
else
    print_error "❌ Webhook receiver is not responding"
    print_status "Check service status: sudo systemctl status webhook-receiver"
fi

print_status "🎉 Setup complete!"
echo ""
echo "📋 Configuration Summary:"
echo "  - Domain: $DOMAIN"
echo "  - Service: webhook-receiver (port 3001)"
echo "  - Nginx config: /etc/nginx/conf.d/webhook-receiver.conf"
echo "  - Health check: http://$DOMAIN/health"
if [[ "$SETUP_SSL" =~ ^[Yy]$ ]]; then
    echo "  - Webhook endpoint: https://$DOMAIN/webhook/app-store-connect"
    echo "  - SSL: Enabled with Let's Encrypt"
else
    echo "  - Webhook endpoint: http://$DOMAIN/webhook/app-store-connect (HTTP only)"
    echo "  - SSL: Not configured (run script again to enable)"
fi
echo ""
echo "🔧 Management commands:"
echo "  - Restart webhook: sudo systemctl restart webhook-receiver"
echo "  - Check logs: sudo journalctl -u webhook-receiver -f"
echo "  - Reload nginx: sudo systemctl reload nginx"
echo "  - Renew SSL: sudo certbot renew"
echo ""
echo "⚠️  Next steps:"
echo "  1. Configure DNS to point $DOMAIN to this server (44.212.121.39)"
echo "  2. Set webhook secret in /opt/webhook-receiver/.env"
echo "  3. Configure webhook URL in Apple App Store Connect"
echo "  4. Test webhook delivery" 