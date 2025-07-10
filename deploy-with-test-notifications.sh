#!/bin/bash

# Enhanced deployment script for Apple App Store Connect Webhook Receiver
# with Test Notification functionality
# 
# This script deploys the webhook receiver with test notification support
# to your AWS EC2 instance.

set -e

# Configuration
SERVER_IP="44.212.121.39"
SERVER_USER="ubuntu"
DEPLOY_DIR="/opt/webhook-receiver"
SERVICE_NAME="webhook-receiver"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO:${NC} $1"
}

# Check if server is reachable
check_server() {
    log "Checking server connectivity..."
    if ! ping -c 1 "$SERVER_IP" &> /dev/null; then
        error "Cannot reach server at $SERVER_IP"
        exit 1
    fi
    log "Server is reachable"
}

# Upload files to server
upload_files() {
    log "Uploading files to server..."
    
    # Create temporary directory for files
    TEMP_DIR=$(mktemp -d)
    
    # Copy files to temporary directory
    cp webhook-receiver.js "$TEMP_DIR/"
    cp package.json "$TEMP_DIR/"
    cp package-lock.json "$TEMP_DIR/"
    cp env.example "$TEMP_DIR/"
    cp test-notifications.js "$TEMP_DIR/"
    cp TEST_NOTIFICATIONS.md "$TEMP_DIR/"
    cp README.md "$TEMP_DIR/"
    
    # Upload files
    scp -r "$TEMP_DIR"/* "$SERVER_USER@$SERVER_IP:~/"
    
    # Clean up
    rm -rf "$TEMP_DIR"
    
    log "Files uploaded successfully"
}

# Deploy to server
deploy_to_server() {
    log "Deploying to server..."
    
    ssh "$SERVER_USER@$SERVER_IP" << 'EOF'
        # Stop the service if running
        sudo systemctl stop webhook-receiver || true
        
        # Create application directory
        sudo mkdir -p /opt/webhook-receiver
        
        # Move files to application directory
        sudo mv ~/webhook-receiver.js /opt/webhook-receiver/
        sudo mv ~/package.json /opt/webhook-receiver/
        sudo mv ~/package-lock.json /opt/webhook-receiver/
        sudo mv ~/test-notifications.js /opt/webhook-receiver/
        sudo mv ~/TEST_NOTIFICATIONS.md /opt/webhook-receiver/
        sudo mv ~/README.md /opt/webhook-receiver/
        
        # Set up environment file if it doesn't exist
        if [ ! -f /opt/webhook-receiver/.env ]; then
            sudo mv ~/env.example /opt/webhook-receiver/.env
            echo "Created .env file from example"
        else
            echo "Using existing .env file"
            rm -f ~/env.example
        fi
        
        # Set ownership and permissions
        sudo chown -R ubuntu:ubuntu /opt/webhook-receiver
        sudo chmod +x /opt/webhook-receiver/webhook-receiver.js
        sudo chmod +x /opt/webhook-receiver/test-notifications.js
        
        # Install dependencies
        cd /opt/webhook-receiver
        npm install
        
        # Create systemd service file
        sudo tee /etc/systemd/system/webhook-receiver.service > /dev/null << 'SERVICE_EOF'
[Unit]
Description=Apple App Store Connect Webhook Receiver
After=network.target

[Service]
Type=simple
User=ubuntu
Group=ubuntu
WorkingDirectory=/opt/webhook-receiver
ExecStart=/usr/bin/node webhook-receiver.js
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
SERVICE_EOF
        
        # Reload systemd and start service
        sudo systemctl daemon-reload
        sudo systemctl enable webhook-receiver
        sudo systemctl start webhook-receiver
        
        echo "Deployment completed successfully"
        echo "Service status:"
        sudo systemctl status webhook-receiver --no-pager
EOF
    
    log "Deployment completed"
}

# Check service status
check_service() {
    log "Checking service status..."
    
    ssh "$SERVER_USER@$SERVER_IP" << 'EOF'
        echo "Service Status:"
        sudo systemctl is-active webhook-receiver
        
        echo -e "\nService Logs (last 10 lines):"
        sudo journalctl -u webhook-receiver -n 10 --no-pager
        
        echo -e "\nListening Ports:"
        sudo netstat -tlnp | grep :3001 || echo "Port 3001 not listening"
EOF
}

# Test endpoints
test_endpoints() {
    log "Testing endpoints..."
    
    # Test health endpoint
    info "Testing health endpoint..."
    if curl -s "http://$SERVER_IP:3001/health" | grep -q "healthy"; then
        log "Health endpoint is working"
    else
        warn "Health endpoint may not be working"
    fi
    
    # Test root endpoint
    info "Testing root endpoint..."
    if curl -s "http://$SERVER_IP:3001/" | grep -q "Apple App Store Connect"; then
        log "Root endpoint is working"
    else
        warn "Root endpoint may not be working"
    fi
    
    info "Manual testing commands:"
    echo "  Health: curl http://$SERVER_IP:3001/health"
    echo "  Root: curl http://$SERVER_IP:3001/"
    echo "  Test notification: curl -X POST http://$SERVER_IP:3001/test/request-notification"
}

# Display configuration instructions
show_configuration() {
    log "Configuration Instructions:"
    echo ""
    echo "1. Configure environment variables:"
    echo "   sudo nano /opt/webhook-receiver/.env"
    echo ""
    echo "2. For test notifications, add these variables:"
    echo "   APP_STORE_SERVER_API_KEY_ID=your-key-id"
    echo "   APP_STORE_SERVER_API_ISSUER_ID=your-issuer-id"
    echo "   APP_STORE_SERVER_API_PRIVATE_KEY_PATH=/opt/webhook-receiver/AuthKey_XXXXXXXXXX.p8"
    echo "   APP_STORE_BUNDLE_ID=com.yourcompany.yourapp"
    echo ""
    echo "3. Upload your App Store Connect API private key:"
    echo "   scp AuthKey_XXXXXXXXXX.p8 $SERVER_USER@$SERVER_IP:/opt/webhook-receiver/"
    echo ""
    echo "4. Set proper permissions for the private key:"
    echo "   ssh $SERVER_USER@$SERVER_IP 'sudo chmod 600 /opt/webhook-receiver/AuthKey_*.p8'"
    echo ""
    echo "5. Restart the service after configuration:"
    echo "   ssh $SERVER_USER@$SERVER_IP 'sudo systemctl restart webhook-receiver'"
    echo ""
    echo "6. Test the configuration:"
    echo "   ssh $SERVER_USER@$SERVER_IP 'cd /opt/webhook-receiver && node test-notifications.js'"
    echo ""
    echo "See TEST_NOTIFICATIONS.md for detailed setup instructions."
}

# Main deployment process
main() {
    log "Starting deployment of Apple App Store Connect Webhook Receiver with Test Notifications"
    
    check_server
    upload_files
    deploy_to_server
    
    # Wait a moment for service to start
    sleep 5
    
    check_service
    test_endpoints
    show_configuration
    
    log "Deployment completed successfully!"
    log "Your webhook receiver is now running with test notification support."
}

# Run main function
main "$@" 