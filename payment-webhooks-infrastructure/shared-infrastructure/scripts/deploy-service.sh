#!/bin/bash

# Multi-Provider Webhook Service Deployment Script
# Usage: ./deploy-service.sh <service-name> <port> <domain>

set -e

# Configuration
EC2_HOST="44.212.121.39"
EC2_USER="ubuntu"
DEPLOY_DIR="/opt/webhook-services"
NGINX_CONF_DIR="/etc/nginx/conf.d"
SYSTEMD_DIR="/etc/systemd/system"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check arguments
if [ $# -lt 3 ]; then
    log_error "Usage: $0 <service-name> <port> <domain>"
    log_info "Example: $0 stripe-webhook 3001 example.com"
    exit 1
fi

SERVICE_NAME="$1"
PORT="$2"
DOMAIN="$3"
SERVICE_DIR="services/${SERVICE_NAME}"
SUBDOMAIN="${SERVICE_NAME}.${DOMAIN}"

# Validate service directory exists
if [ ! -d "$SERVICE_DIR" ]; then
    log_error "Service directory '$SERVICE_DIR' does not exist"
    exit 1
fi

log_info "Starting deployment of $SERVICE_NAME service..."
log_info "Service: $SERVICE_NAME"
log_info "Port: $PORT"
log_info "Domain: $SUBDOMAIN"
log_info "EC2 Host: $EC2_HOST"

# Step 1: Test SSH connection
log_info "Testing SSH connection to EC2 instance..."
if ! ssh -o ConnectTimeout=10 -o BatchMode=yes "$EC2_USER@$EC2_HOST" exit 2>/dev/null; then
    log_error "Cannot connect to EC2 instance. Please check your SSH configuration."
    exit 1
fi
log_success "SSH connection successful"

# Step 2: Create deployment directory on EC2
log_info "Creating deployment directory on EC2..."
ssh "$EC2_USER@$EC2_HOST" "sudo mkdir -p $DEPLOY_DIR/$SERVICE_NAME"
log_success "Deployment directory created"

# Step 3: Copy service files to EC2
log_info "Copying service files to EC2..."
scp -r "$SERVICE_DIR/"* "$EC2_USER@$EC2_HOST:$DEPLOY_DIR/$SERVICE_NAME/"
log_success "Service files copied"

# Step 4: Install dependencies on EC2
log_info "Installing Node.js dependencies on EC2..."
ssh "$EC2_USER@$EC2_HOST" "cd $DEPLOY_DIR/$SERVICE_NAME && npm install --production"
log_success "Dependencies installed"

# Step 5: Create systemd service file
log_info "Creating systemd service file..."
cat > "/tmp/${SERVICE_NAME}.service" << EOF
[Unit]
Description=${SERVICE_NAME} Webhook Service
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=$DEPLOY_DIR/$SERVICE_NAME
ExecStart=/usr/bin/node src/app.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=$PORT
EnvironmentFile=$DEPLOY_DIR/$SERVICE_NAME/.env

[Install]
WantedBy=multi-user.target
EOF

scp "/tmp/${SERVICE_NAME}.service" "$EC2_USER@$EC2_HOST:/tmp/"
ssh "$EC2_USER@$EC2_HOST" "sudo mv /tmp/${SERVICE_NAME}.service $SYSTEMD_DIR/"
rm "/tmp/${SERVICE_NAME}.service"
log_success "Systemd service file created"

# Step 6: Create nginx configuration
log_info "Creating nginx configuration..."
cat > "/tmp/${SERVICE_NAME}.conf" << EOF
server {
    listen 80;
    server_name $SUBDOMAIN www.$SUBDOMAIN;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $SUBDOMAIN www.$SUBDOMAIN;
    
    # SSL configuration (to be configured with certbot)
    ssl_certificate /etc/letsencrypt/live/$SUBDOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$SUBDOMAIN/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Webhook endpoint
    location /webhook {
        proxy_pass http://localhost:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Increase body size for webhook payloads
        client_max_body_size 10M;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://localhost:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Test endpoints (if available)
    location /test {
        proxy_pass http://localhost:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Block access to all other paths
    location / {
        return 404;
    }
}
EOF

scp "/tmp/${SERVICE_NAME}.conf" "$EC2_USER@$EC2_HOST:/tmp/"
ssh "$EC2_USER@$EC2_HOST" "sudo mv /tmp/${SERVICE_NAME}.conf $NGINX_CONF_DIR/"
rm "/tmp/${SERVICE_NAME}.conf"
log_success "Nginx configuration created"

# Step 7: Set proper permissions
log_info "Setting proper permissions..."
ssh "$EC2_USER@$EC2_HOST" "sudo chown -R ubuntu:ubuntu $DEPLOY_DIR/$SERVICE_NAME"
ssh "$EC2_USER@$EC2_HOST" "sudo chmod +x $DEPLOY_DIR/$SERVICE_NAME/src/app.js"
log_success "Permissions set"

# Step 8: Reload systemd and start service
log_info "Reloading systemd and starting service..."
ssh "$EC2_USER@$EC2_HOST" "sudo systemctl daemon-reload"
ssh "$EC2_USER@$EC2_HOST" "sudo systemctl enable ${SERVICE_NAME}"
ssh "$EC2_USER@$EC2_HOST" "sudo systemctl start ${SERVICE_NAME}"
log_success "Service started"

# Step 9: Test nginx configuration and reload
log_info "Testing nginx configuration..."
if ssh "$EC2_USER@$EC2_HOST" "sudo nginx -t"; then
    ssh "$EC2_USER@$EC2_HOST" "sudo systemctl reload nginx"
    log_success "Nginx configuration reloaded"
else
    log_error "Nginx configuration test failed"
    exit 1
fi

# Step 10: Check service status
log_info "Checking service status..."
SERVICE_STATUS=$(ssh "$EC2_USER@$EC2_HOST" "sudo systemctl is-active ${SERVICE_NAME}")
if [ "$SERVICE_STATUS" = "active" ]; then
    log_success "Service is running successfully"
else
    log_error "Service is not running. Status: $SERVICE_STATUS"
    log_info "Checking service logs..."
    ssh "$EC2_USER@$EC2_HOST" "sudo journalctl -u ${SERVICE_NAME} -n 20"
    exit 1
fi

# Step 11: Setup SSL certificate with certbot
log_info "Setting up SSL certificate with certbot..."
if ssh "$EC2_USER@$EC2_HOST" "sudo certbot --nginx -d $SUBDOMAIN -d www.$SUBDOMAIN --non-interactive --agree-tos --email admin@$DOMAIN"; then
    log_success "SSL certificate configured successfully"
else
    log_warning "SSL certificate setup failed. You may need to configure it manually."
fi

# Step 12: Final health check
log_info "Performing final health check..."
sleep 5
if ssh "$EC2_USER@$EC2_HOST" "curl -f http://localhost:$PORT/health" > /dev/null 2>&1; then
    log_success "Health check passed"
else
    log_warning "Health check failed. Service may need additional configuration."
fi

log_success "Deployment completed successfully!"
log_info "Service Details:"
log_info "  - Service Name: $SERVICE_NAME"
log_info "  - Port: $PORT"
log_info "  - Domain: https://$SUBDOMAIN"
log_info "  - Health Check: https://$SUBDOMAIN/health"
log_info "  - Webhook Endpoint: https://$SUBDOMAIN/webhook"
log_info ""
log_info "Management Commands:"
log_info "  - Status: ssh $EC2_USER@$EC2_HOST 'sudo systemctl status $SERVICE_NAME'"
log_info "  - Logs: ssh $EC2_USER@$EC2_HOST 'sudo journalctl -u $SERVICE_NAME -f'"
log_info "  - Restart: ssh $EC2_USER@$EC2_HOST 'sudo systemctl restart $SERVICE_NAME'"
log_info "  - Stop: ssh $EC2_USER@$EC2_HOST 'sudo systemctl stop $SERVICE_NAME'"

echo ""
log_info "Next steps:"
log_info "1. Configure DNS records using: ./shared-infrastructure/scripts/cloudflare-dns.js setup-webhook $SERVICE_NAME $EC2_HOST $DOMAIN"
log_info "2. Test the webhook endpoint: curl https://$SUBDOMAIN/health"
log_info "3. Configure environment variables in: $DEPLOY_DIR/$SERVICE_NAME/.env" 