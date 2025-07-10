#!/bin/bash

# Deploy script for Apple App Store Connect Webhook Receiver on EC2
# This script can be run locally to deploy to remote server or directly on the server

set -e

# Configuration
SERVER_IP="44.212.121.39"
SERVER_USER="ubuntu"
APP_DIR="/opt/webhook-receiver"
SERVICE_NAME="webhook-receiver"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Check if we're running locally or on the server
is_local_deployment() {
    [[ "$(hostname -I 2>/dev/null | grep -o "$SERVER_IP")" != "$SERVER_IP" ]] && [[ "$(curl -s ifconfig.me 2>/dev/null)" != "$SERVER_IP" ]]
}

# Upload files to server (local deployment only)
upload_files() {
    print_status "Uploading files to server..."
    
    # Check if server is reachable via SSH
    if ! ssh -o ConnectTimeout=10 -o BatchMode=yes "$SERVER_USER@$SERVER_IP" 'exit' &> /dev/null; then
        print_error "Cannot reach server at $SERVER_IP via SSH"
        exit 1
    fi
    
    # Create temporary directory for files
    TEMP_DIR=$(mktemp -d)
    
    # Copy files to temporary directory
    cp -r src/ "$TEMP_DIR/" 2>/dev/null || { print_error "src/ directory not found"; exit 1; }
    cp package.json "$TEMP_DIR/" 2>/dev/null || { print_error "package.json not found"; exit 1; }
    cp package-lock.json "$TEMP_DIR/" 2>/dev/null || print_warning "package-lock.json not found"
    cp env.example "$TEMP_DIR/" 2>/dev/null || print_warning "env.example not found"
    cp README.md "$TEMP_DIR/" 2>/dev/null || true
    
    # Upload files using scp (preserve directory structure)
    scp -r "$TEMP_DIR"/* "$SERVER_USER@$SERVER_IP:~/" || { print_error "Failed to upload files"; exit 1; }
    
    # Clean up temp directory
    rm -rf "$TEMP_DIR"
    
    # Upload the src directory separately to ensure it's preserved
    scp -r src "$SERVER_USER@$SERVER_IP:~/" || { print_error "Failed to upload src directory"; exit 1; }
    
    print_status "Files uploaded successfully"
}

# Deploy on server (can be run locally via SSH or directly on server)
deploy_on_server() {
    print_status "Starting deployment on server..."
    
    # Check if running as root
    if [[ $EUID -eq 0 ]]; then
       print_error "This script should not be run as root. Please run as ubuntu user."
       exit 1
    fi

    # Update system
    print_status "Updating system packages..."
    sudo apt update && sudo apt upgrade -y

    # Install Node.js 20+ if not already installed
    if ! command -v node &> /dev/null || [[ $(node --version | cut -d'.' -f1 | cut -d'v' -f2) -lt 20 ]]; then
        print_status "Installing Node.js 20..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi

    # Verify Node.js installation
    NODE_VERSION=$(node --version)
    NPM_VERSION=$(npm --version)
    print_status "Node.js version: $NODE_VERSION"
    print_status "NPM version: $NPM_VERSION"

    # Stop the service if running
    print_status "Stopping existing service..."
    sudo systemctl stop $SERVICE_NAME 2>/dev/null || true

    # Create app directory
    print_status "Creating application directory: $APP_DIR"
    sudo mkdir -p $APP_DIR
    sudo chown $USER:$USER $APP_DIR

    # Copy application files
    print_status "Copying application files..."
    if [[ -d ~/src ]]; then
        cp -r ~/src $APP_DIR/
        cp ~/package.json $APP_DIR/ 2>/dev/null || { print_error "package.json not found in home directory"; exit 1; }
        cp ~/package-lock.json $APP_DIR/ 2>/dev/null || print_warning "package-lock.json not found"
        cp ~/README.md $APP_DIR/ 2>/dev/null || true
        
        # Clean up uploaded files
        rm -rf ~/src ~/package.json ~/package-lock.json ~/README.md 2>/dev/null || true
    else
        print_error "Application files not found. Make sure files are uploaded first."
        exit 1
    fi

    # Change to app directory
    cd $APP_DIR

    # Install dependencies
    print_status "Installing dependencies..."
    npm install

    # Create environment file from template
    print_status "Setting up environment file..."
    if [[ -f ~/env.example ]]; then
        cp ~/env.example .env
        rm ~/env.example
    elif [[ ! -f .env ]]; then
        cat > .env << EOF
NODE_ENV=production
PORT=3001
# APP_STORE_WEBHOOK_SECRET=your-webhook-secret-here
# WEBHOOK_DOMAIN=webhook.yourdomain.com
# ADMIN_EMAIL=admin@yourdomain.com
# FIRESTORE_ENABLED=false
# FIREBASE_PROJECT_ID=your-project-id
# APP_STORE_BUNDLE_ID=com.yourcompany.yourapp
# APP_STORE_SERVER_API_KEY_ID=your-key-id
# APP_STORE_SERVER_API_ISSUER_ID=your-issuer-id
# APP_STORE_SERVER_API_PRIVATE_KEY_PATH=/opt/webhook-receiver/AuthKey_XXXXXXXXXX.p8
EOF
    fi

    # Secure the environment file
    chmod 600 .env

    # Create systemd service
    print_status "Creating systemd service..."
    sudo tee /etc/systemd/system/$SERVICE_NAME.service > /dev/null <<EOF
[Unit]
Description=Apple App Store Connect Webhook Receiver
After=network.target

[Service]
Type=simple
User=ubuntu
Group=ubuntu
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
EnvironmentFile=$APP_DIR/.env
ExecStart=/usr/bin/node src/app.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=$SERVICE_NAME

[Install]
WantedBy=multi-user.target
EOF

    # Enable and start service
    print_status "Enabling and starting webhook receiver service..."
    sudo systemctl daemon-reload
    sudo systemctl enable $SERVICE_NAME
    sudo systemctl start $SERVICE_NAME

    # Wait a moment for service to start
    sleep 5

    # Check service status
    if sudo systemctl is-active --quiet $SERVICE_NAME; then
        print_status "✅ Webhook receiver service is running!"
    else
        print_error "❌ Webhook receiver service failed to start"
        sudo systemctl status $SERVICE_NAME
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
    sudo systemctl status $SERVICE_NAME --no-pager

    # Show logs
    print_status "Recent logs:"
    sudo journalctl -u $SERVICE_NAME --no-pager -n 10

    print_status "🎉 Deployment complete!"
    echo ""
    echo "📋 Service Information:"
    echo "  - Service name: $SERVICE_NAME"
    echo "  - Port: 3001"
    echo "  - Health check: http://localhost:3001/health"
    echo "  - Webhook endpoint: http://localhost:3001/webhook/app-store-connect"
    echo "  - Application directory: $APP_DIR"
    echo ""
    echo "🔧 Management commands:"
    echo "  - Start: sudo systemctl start $SERVICE_NAME"
    echo "  - Stop: sudo systemctl stop $SERVICE_NAME"
    echo "  - Restart: sudo systemctl restart $SERVICE_NAME"
    echo "  - Status: sudo systemctl status $SERVICE_NAME"
    echo "  - Logs: sudo journalctl -u $SERVICE_NAME -f"
    echo ""
    echo "⚠️  Next steps:"
    echo "  1. Configure environment variables in $APP_DIR/.env"
    echo "  2. Configure nginx reverse proxy (use setup-nginx.sh)"
    echo "  3. Set up SSL with certbot"
    echo "  4. Configure webhook secret and other settings"
    echo "  5. Set up webhook URL in App Store Connect"
    echo ""
    echo "🔧 Configuration:"
    echo "  - Edit environment: sudo nano $APP_DIR/.env"
    echo "  - Restart after config changes: sudo systemctl restart $SERVICE_NAME"
}

# Main deployment function
main() {
    echo "🚀 Deploying Apple App Store Connect Webhook Receiver..."
    
    if is_local_deployment; then
        print_info "Running local deployment to remote server ($SERVER_IP)"
        upload_files
        
        # Run deployment on remote server
        ssh "$SERVER_USER@$SERVER_IP" 'bash -s' < <(
            echo "APP_DIR=\"$APP_DIR\""
            echo "SERVICE_NAME=\"$SERVICE_NAME\""
            declare -f deploy_on_server print_status print_warning print_error print_info
            echo "deploy_on_server"
        )
    else
        print_info "Running deployment directly on server"
        deploy_on_server
    fi
    
    print_status "Deployment completed successfully!"
}

# Check if script is being sourced or executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi 