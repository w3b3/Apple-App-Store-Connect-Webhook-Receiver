# Shared Infrastructure Scripts

This directory contains utility scripts for managing shared infrastructure components.

## Cloudflare DNS Manager

The `cloudflare-dns.js` script provides a command-line interface for managing Cloudflare DNS records, specifically designed for webhook service deployments.

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   Create a `.env` file in this directory with your Cloudflare credentials:
   ```
   CLOUDFLARE_TOKEN=your_cloudflare_api_token
   CLOUDFLARE_ZONE_ID=your_zone_id
   ```

3. **Verify setup:**
   ```bash
   node cloudflare-dns.js verify
   ```

### Usage

```bash
# Verify API token
node cloudflare-dns.js verify

# List all DNS records
node cloudflare-dns.js list

# List specific record type
node cloudflare-dns.js list A

# Create DNS record
node cloudflare-dns.js create A subdomain.example.com 192.168.1.1

# Update DNS record
node cloudflare-dns.js update record_id A subdomain.example.com 192.168.1.2

# Delete DNS record
node cloudflare-dns.js delete record_id

# Create or update DNS record (upsert)
node cloudflare-dns.js upsert A subdomain.example.com 192.168.1.1

# Setup webhook service DNS (creates A and CNAME records)
node cloudflare-dns.js setup-webhook apple-webhooks 44.212.121.39 example.com
```

### Environment Variables

- `CLOUDFLARE_TOKEN`: Your Cloudflare API token with DNS edit permissions
- `CLOUDFLARE_ZONE_ID`: The zone ID for your domain

### Features

- **Token verification**: Verify your Cloudflare API token
- **DNS record management**: Create, read, update, delete DNS records
- **Webhook service setup**: Automated DNS setup for webhook services
- **Upsert operations**: Create or update records intelligently
- **Environment file support**: Load credentials from `.env` file

### Security Notes

- Keep your `.env` file secure and never commit it to version control
- Use API tokens with minimal required permissions (Zone:DNS:Edit)
- Consider using different tokens for different environments 