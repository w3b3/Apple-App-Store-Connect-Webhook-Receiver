# Nginx and SSL Configuration for Webhook Services

This directory contains scripts and configurations for setting up external access to webhook services with nginx reverse proxy and SSL certificates.

## Overview

The webhook infrastructure uses nginx as a reverse proxy to provide:
- SSL termination with Let's Encrypt certificates
- Rate limiting for webhook endpoints
- Security headers and protection
- Load balancing and health checks
- Centralized logging

## Architecture

```
Internet → Cloudflare → EC2 (nginx) → Local Services
                                   ├── apple-webhook:3001
                                   └── stripe-webhook:3002
```

## Quick Setup

### Prerequisites

1. **Domain**: You need a domain managed by Cloudflare
2. **Cloudflare Token**: API token with Zone:Edit permissions
3. **EC2 Access**: SSH access to your EC2 instance (44.212.121.39)

### 1. Setup DNS Records

```bash
# Navigate to the nginx directory
cd payment-webhooks-infrastructure/shared-infrastructure/nginx/

# Setup DNS records for your domain
./setup-dns.sh your-domain.com your-cloudflare-token
```

This script will:
- Verify your Cloudflare token
- Create A records for apple-webhook.your-domain.com and stripe-webhook.your-domain.com
- Create www subdomains for each service
- Wait for DNS propagation

### 2. Configure Nginx and SSL

```bash
# Setup nginx and SSL certificates
./setup-nginx-ssl.sh your-domain.com admin@your-domain.com
```

This script will:
- Install nginx and certbot on EC2
- Create nginx configurations for each service
- Configure SSL certificates with Let's Encrypt
- Setup automatic certificate renewal
- Configure firewall rules
- Test all configurations

## Service URLs

After setup, your services will be available at:

- **Apple Webhook Service**:
  - Health Check: `https://apple-webhook.your-domain.com/health`
  - Webhook Endpoint: `https://apple-webhook.your-domain.com/webhook`
  - Test Endpoint: `https://apple-webhook.your-domain.com/test`

- **Stripe Webhook Service**:
  - Health Check: `https://stripe-webhook.your-domain.com/health`
  - Webhook Endpoint: `https://stripe-webhook.your-domain.com/webhook`
  - Test Endpoint: `https://stripe-webhook.your-domain.com/test`
  - Configuration: `https://stripe-webhook.your-domain.com/config`

## Security Features

### Rate Limiting
- Webhook endpoints: 10 requests/second with burst of 20
- Health check endpoints: 30 requests/second with burst of 10
- Test endpoints: 10 requests/second with burst of 5

### Security Headers
- Strict Transport Security (HSTS)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection
- Referrer-Policy: strict-origin-when-cross-origin

### SSL Configuration
- TLS 1.2 and 1.3 only
- Strong cipher suites
- OCSP stapling
- Perfect Forward Secrecy

## Monitoring and Logging

### Log Files
- Access logs: `/var/log/nginx/apple-webhook_access.log`
- Access logs: `/var/log/nginx/stripe-webhook_access.log`
- Error logs: `/var/log/nginx/apple-webhook_error.log`
- Error logs: `/var/log/nginx/stripe-webhook_error.log`

### Health Checks
```bash
# Check service health
curl https://apple-webhook.your-domain.com/health
curl https://stripe-webhook.your-domain.com/health

# Check nginx status
ssh ubuntu@44.212.121.39 'sudo systemctl status nginx'

# View real-time logs
ssh ubuntu@44.212.121.39 'sudo tail -f /var/log/nginx/*_access.log'
```

## Management Commands

### Nginx Management
```bash
# Check nginx status
ssh ubuntu@44.212.121.39 'sudo systemctl status nginx'

# Test nginx configuration
ssh ubuntu@44.212.121.39 'sudo nginx -t'

# Reload nginx configuration
ssh ubuntu@44.212.121.39 'sudo systemctl reload nginx'

# Restart nginx
ssh ubuntu@44.212.121.39 'sudo systemctl restart nginx'
```

### SSL Certificate Management
```bash
# Check certificate status
ssh ubuntu@44.212.121.39 'sudo certbot certificates'

# Renew certificates manually
ssh ubuntu@44.212.121.39 'sudo certbot renew'

# Test certificate renewal
ssh ubuntu@44.212.121.39 'sudo certbot renew --dry-run'
```

### Service Management
```bash
# Check service status
ssh ubuntu@44.212.121.39 'sudo systemctl status apple-webhook'
ssh ubuntu@44.212.121.39 'sudo systemctl status stripe-webhook'

# View service logs
ssh ubuntu@44.212.121.39 'sudo journalctl -u apple-webhook -f'
ssh ubuntu@44.212.121.39 'sudo journalctl -u stripe-webhook -f'

# Restart services
ssh ubuntu@44.212.121.39 'sudo systemctl restart apple-webhook'
ssh ubuntu@44.212.121.39 'sudo systemctl restart stripe-webhook'
```

## Troubleshooting

### Common Issues

1. **SSL Certificate Failed**
   - Ensure DNS records are properly configured
   - Wait for DNS propagation (up to 24 hours)
   - Check domain ownership

2. **Service Not Accessible**
   - Check if services are running: `sudo systemctl status service-name`
   - Check nginx configuration: `sudo nginx -t`
   - Check firewall: `sudo ufw status`

3. **Rate Limiting Issues**
   - Adjust rate limits in nginx configuration
   - Check access logs for rate limit violations

### Debug Commands

```bash
# Check DNS resolution
dig +short apple-webhook.your-domain.com
dig +short stripe-webhook.your-domain.com

# Test local service connectivity
ssh ubuntu@44.212.121.39 'curl -f http://localhost:3001/health'
ssh ubuntu@44.212.121.39 'curl -f http://localhost:3002/health'

# Check nginx error logs
ssh ubuntu@44.212.121.39 'sudo tail -f /var/log/nginx/error.log'

# Check service logs
ssh ubuntu@44.212.121.39 'sudo journalctl -u apple-webhook -n 50'
ssh ubuntu@44.212.121.39 'sudo journalctl -u stripe-webhook -n 50'
```

## Configuration Files

### Nginx Configuration Structure
```
/etc/nginx/
├── conf.d/
│   ├── webhook-services.conf     # Main configuration
│   ├── apple-webhook.conf        # Apple service config
│   └── stripe-webhook.conf       # Stripe service config
└── sites-available/
    └── default                   # Default site (disabled)
```

### SSL Certificates
```
/etc/letsencrypt/live/
├── apple-webhook.your-domain.com/
│   ├── fullchain.pem
│   └── privkey.pem
└── stripe-webhook.your-domain.com/
    ├── fullchain.pem
    └── privkey.pem
```

## Adding New Services

To add a new webhook service (e.g., Google Play):

1. Update the `SERVICES` array in both scripts:
   ```bash
   declare -A SERVICES=(
       ["apple-webhook"]="3001"
       ["stripe-webhook"]="3002"
       ["google-play-webhook"]="3003"  # Add new service
   )
   ```

2. Re-run the setup scripts:
   ```bash
   ./setup-dns.sh your-domain.com your-cloudflare-token
   ./setup-nginx-ssl.sh your-domain.com admin@your-domain.com
   ```

## Performance Tuning

### Nginx Optimization
- Worker processes: Auto-configured based on CPU cores
- Worker connections: 1024 per worker
- Keepalive timeout: 65 seconds
- Client body size: 10MB for webhook payloads

### SSL Optimization
- Session cache: 10MB shared cache
- Session timeout: 10 minutes
- OCSP stapling enabled
- HTTP/2 enabled

## Security Considerations

1. **Webhook Endpoints**: Only accept POST requests with proper authentication
2. **Rate Limiting**: Prevents abuse and DoS attacks
3. **SSL/TLS**: All traffic encrypted with strong ciphers
4. **Headers**: Security headers prevent common attacks
5. **Firewall**: UFW configured to allow only necessary ports
6. **Logging**: Comprehensive logging for security monitoring

## Backup and Recovery

### Configuration Backup
```bash
# Backup nginx configurations
ssh ubuntu@44.212.121.39 'sudo tar -czf /tmp/nginx-backup.tar.gz /etc/nginx/conf.d/'

# Backup SSL certificates
ssh ubuntu@44.212.121.39 'sudo tar -czf /tmp/ssl-backup.tar.gz /etc/letsencrypt/'
```

### Recovery
```bash
# Restore nginx configurations
ssh ubuntu@44.212.121.39 'sudo tar -xzf /tmp/nginx-backup.tar.gz -C /'

# Restore SSL certificates
ssh ubuntu@44.212.121.39 'sudo tar -xzf /tmp/ssl-backup.tar.gz -C /'

# Reload nginx
ssh ubuntu@44.212.121.39 'sudo systemctl reload nginx'
``` 