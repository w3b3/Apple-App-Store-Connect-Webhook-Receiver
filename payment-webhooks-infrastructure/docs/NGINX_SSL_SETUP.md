# Nginx and SSL Setup Implementation

## Overview

This document describes the implementation of nginx reverse proxy and SSL certificate configuration for external access to webhook services. The setup provides secure, production-ready external access to Apple and Stripe webhook services running on EC2.

## Implementation Summary

### Components Created

1. **Setup Scripts**:
   - `setup-dns.sh` - Cloudflare DNS configuration automation
   - `setup-nginx-ssl.sh` - Nginx and SSL certificate setup
   - `test-setup.sh` - Comprehensive testing and validation

2. **Configuration Features**:
   - SSL termination with Let's Encrypt certificates
   - Rate limiting for webhook endpoints
   - Security headers and HSTS
   - Centralized logging
   - Firewall configuration

3. **Service Architecture**:
   ```
   Internet → Cloudflare → EC2 (nginx:443) → Local Services
                                           ├── apple-webhook:3001
                                           └── stripe-webhook:3002
   ```

## Security Features Implemented

### SSL/TLS Configuration
- **Protocols**: TLS 1.2 and 1.3 only
- **Ciphers**: Strong cipher suites with Perfect Forward Secrecy
- **OCSP Stapling**: Enabled for certificate validation
- **HTTP/2**: Enabled for better performance
- **HSTS**: Strict Transport Security with preload

### Rate Limiting
- **Webhook endpoints**: 10 requests/second with burst of 20
- **Health checks**: 30 requests/second with burst of 10
- **Test endpoints**: 10 requests/second with burst of 5

### Security Headers
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`

### Firewall Configuration
- UFW enabled with only necessary ports open
- SSH access maintained
- Nginx Full profile allowed (ports 80, 443)

## Service Endpoints

### Apple Webhook Service
- **Domain**: `apple-webhook.your-domain.com`
- **Health Check**: `https://apple-webhook.your-domain.com/health`
- **Webhook Endpoint**: `https://apple-webhook.your-domain.com/webhook`
- **Test Endpoint**: `https://apple-webhook.your-domain.com/test`

### Stripe Webhook Service
- **Domain**: `stripe-webhook.your-domain.com`
- **Health Check**: `https://stripe-webhook.your-domain.com/health`
- **Webhook Endpoint**: `https://stripe-webhook.your-domain.com/webhook`
- **Test Endpoint**: `https://stripe-webhook.your-domain.com/test`
- **Configuration**: `https://stripe-webhook.your-domain.com/config`

## Setup Process

### Prerequisites
1. Domain managed by Cloudflare
2. Cloudflare API token with Zone:Edit permissions
3. SSH access to EC2 instance (44.212.121.39)

### Step 1: DNS Configuration
```bash
cd payment-webhooks-infrastructure/shared-infrastructure/nginx/
./setup-dns.sh your-domain.com your-cloudflare-token
```

**Actions Performed**:
- Verifies Cloudflare token
- Gets zone ID for domain
- Creates A records for service subdomains
- Creates www subdomains
- Waits for DNS propagation
- Verifies DNS resolution

### Step 2: Nginx and SSL Setup
```bash
./setup-nginx-ssl.sh your-domain.com admin@your-domain.com
```

**Actions Performed**:
- Installs nginx and certbot
- Creates main nginx configuration with rate limiting
- Creates individual service configurations
- Configures SSL certificates with Let's Encrypt
- Sets up automatic certificate renewal
- Configures firewall rules
- Tests all configurations

### Step 3: Validation
```bash
./test-setup.sh your-domain.com
```

**Tests Performed**:
- SSH connectivity
- Service status checks
- Nginx configuration validation
- Local service connectivity
- DNS resolution
- SSL certificate verification
- External HTTPS connectivity
- Firewall configuration
- Log file creation

## Configuration Files

### Nginx Structure
```
/etc/nginx/
├── conf.d/
│   ├── webhook-services.conf     # Main configuration
│   ├── apple-webhook.conf        # Apple service config
│   └── stripe-webhook.conf       # Stripe service config
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

## Logging and Monitoring

### Log Files
- **Access Logs**: `/var/log/nginx/{service}_access.log`
- **Error Logs**: `/var/log/nginx/{service}_error.log`
- **Custom Format**: Includes request time, upstream response time, and forwarded headers

### Health Monitoring
- Health check endpoints for each service
- Systemd service monitoring
- Nginx status monitoring
- SSL certificate expiration monitoring

## Performance Optimizations

### Nginx Configuration
- **Worker Processes**: Auto-configured based on CPU cores
- **Worker Connections**: 1024 per worker
- **Keepalive**: 65 seconds
- **Client Body Size**: 10MB for webhook payloads
- **Proxy Buffering**: Enabled with 8x4KB buffers

### SSL Optimization
- **Session Cache**: 10MB shared cache
- **Session Timeout**: 10 minutes
- **OCSP Stapling**: Enabled
- **HTTP/2**: Enabled for better performance

## Maintenance Commands

### Nginx Management
```bash
# Check status
ssh ubuntu@44.212.121.39 'sudo systemctl status nginx'

# Test configuration
ssh ubuntu@44.212.121.39 'sudo nginx -t'

# Reload configuration
ssh ubuntu@44.212.121.39 'sudo systemctl reload nginx'
```

### SSL Certificate Management
```bash
# Check certificates
ssh ubuntu@44.212.121.39 'sudo certbot certificates'

# Renew certificates
ssh ubuntu@44.212.121.39 'sudo certbot renew'

# Test renewal
ssh ubuntu@44.212.121.39 'sudo certbot renew --dry-run'
```

### Log Monitoring
```bash
# View access logs
ssh ubuntu@44.212.121.39 'sudo tail -f /var/log/nginx/*_access.log'

# View error logs
ssh ubuntu@44.212.121.39 'sudo tail -f /var/log/nginx/*_error.log'
```

## Troubleshooting

### Common Issues

1. **SSL Certificate Failed**
   - Verify DNS records are configured
   - Wait for DNS propagation
   - Check domain ownership

2. **Rate Limiting**
   - Monitor access logs for 429 errors
   - Adjust rate limits if needed
   - Implement proper retry logic in clients

3. **Service Connectivity**
   - Check service status: `sudo systemctl status service-name`
   - Verify local connectivity: `curl http://localhost:port/health`
   - Check nginx error logs

### Debug Commands
```bash
# DNS resolution
dig +short apple-webhook.your-domain.com

# Local service test
ssh ubuntu@44.212.121.39 'curl -f http://localhost:3001/health'

# Nginx error logs
ssh ubuntu@44.212.121.39 'sudo tail -f /var/log/nginx/error.log'
```

## Security Considerations

1. **Webhook Authentication**: Each service implements proper webhook signature verification
2. **Rate Limiting**: Prevents abuse and DoS attacks
3. **SSL/TLS**: All traffic encrypted with strong ciphers
4. **Security Headers**: Comprehensive security headers implemented
5. **Firewall**: UFW configured with minimal necessary access
6. **Logging**: Comprehensive logging for security monitoring

## Future Enhancements

1. **WAF Integration**: Consider adding Web Application Firewall
2. **DDoS Protection**: Implement additional DDoS protection
3. **Geographic Restrictions**: Add geographic IP filtering if needed
4. **Certificate Monitoring**: Implement certificate expiration alerts
5. **Load Balancing**: Add multiple backend servers if needed

## Conclusion

The nginx and SSL setup provides a robust, secure, and scalable foundation for external webhook access. The implementation includes comprehensive security features, monitoring, and maintenance capabilities while maintaining high performance and reliability.

Key benefits:
- ✅ Secure SSL/TLS termination
- ✅ Rate limiting and DoS protection
- ✅ Comprehensive security headers
- ✅ Automated certificate management
- ✅ Centralized logging and monitoring
- ✅ Easy maintenance and troubleshooting
- ✅ Scalable architecture for additional services 