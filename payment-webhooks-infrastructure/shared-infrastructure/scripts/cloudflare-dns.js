#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');

class CloudflareDNSManager {
    constructor(token, zoneId) {
        this.token = token;
        this.zoneId = zoneId;
        this.baseUrl = 'api.cloudflare.com';
    }

    /**
     * Make API request to Cloudflare
     */
    async makeRequest(method, endpoint, data = null) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: this.baseUrl,
                path: endpoint,
                method: method,
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            };

            const req = https.request(options, (res) => {
                let responseData = '';

                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    try {
                        const parsedData = JSON.parse(responseData);
                        if (parsedData.success) {
                            resolve(parsedData);
                        } else {
                            reject(new Error(`Cloudflare API Error: ${JSON.stringify(parsedData.errors)}`));
                        }
                    } catch (error) {
                        reject(new Error(`Failed to parse response: ${error.message}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(new Error(`Request failed: ${error.message}`));
            });

            if (data) {
                req.write(JSON.stringify(data));
            }

            req.end();
        });
    }

    /**
     * Verify API token
     */
    async verifyToken() {
        try {
            const response = await this.makeRequest('GET', '/client/v4/user/tokens/verify');
            console.log('✅ Cloudflare API token verified successfully');
            return response;
        } catch (error) {
            console.error('❌ Failed to verify Cloudflare API token:', error.message);
            throw error;
        }
    }

    /**
     * List existing DNS records
     */
    async listDNSRecords(type = null, name = null) {
        try {
            let endpoint = `/client/v4/zones/${this.zoneId}/dns_records`;
            const params = [];
            
            if (type) params.push(`type=${type}`);
            if (name) params.push(`name=${name}`);
            
            if (params.length > 0) {
                endpoint += `?${params.join('&')}`;
            }

            const response = await this.makeRequest('GET', endpoint);
            return response.result;
        } catch (error) {
            console.error('❌ Failed to list DNS records:', error.message);
            throw error;
        }
    }

    /**
     * Create DNS record
     */
    async createDNSRecord(type, name, content, ttl = 300, proxied = false) {
        try {
            const data = {
                type: type,
                name: name,
                content: content,
                ttl: ttl,
                proxied: proxied
            };

            const response = await this.makeRequest('POST', `/client/v4/zones/${this.zoneId}/dns_records`, data);
            console.log(`✅ Created ${type} record: ${name} -> ${content}`);
            return response.result;
        } catch (error) {
            console.error(`❌ Failed to create DNS record for ${name}:`, error.message);
            throw error;
        }
    }

    /**
     * Update DNS record
     */
    async updateDNSRecord(recordId, type, name, content, ttl = 300, proxied = false) {
        try {
            const data = {
                type: type,
                name: name,
                content: content,
                ttl: ttl,
                proxied: proxied
            };

            const response = await this.makeRequest('PUT', `/client/v4/zones/${this.zoneId}/dns_records/${recordId}`, data);
            console.log(`✅ Updated ${type} record: ${name} -> ${content}`);
            return response.result;
        } catch (error) {
            console.error(`❌ Failed to update DNS record ${recordId}:`, error.message);
            throw error;
        }
    }

    /**
     * Delete DNS record
     */
    async deleteDNSRecord(recordId) {
        try {
            const response = await this.makeRequest('DELETE', `/client/v4/zones/${this.zoneId}/dns_records/${recordId}`);
            console.log(`✅ Deleted DNS record: ${recordId}`);
            return response.result;
        } catch (error) {
            console.error(`❌ Failed to delete DNS record ${recordId}:`, error.message);
            throw error;
        }
    }

    /**
     * Create or update DNS record (upsert)
     */
    async upsertDNSRecord(type, name, content, ttl = 300, proxied = false) {
        try {
            // Check if record exists
            const existingRecords = await this.listDNSRecords(type, name);
            
            if (existingRecords.length > 0) {
                // Update existing record
                const recordId = existingRecords[0].id;
                return await this.updateDNSRecord(recordId, type, name, content, ttl, proxied);
            } else {
                // Create new record
                return await this.createDNSRecord(type, name, content, ttl, proxied);
            }
        } catch (error) {
            console.error(`❌ Failed to upsert DNS record for ${name}:`, error.message);
            throw error;
        }
    }

    /**
     * Setup webhook service DNS records
     */
    async setupWebhookServiceDNS(serviceName, serverIP, domain) {
        try {
            console.log(`🔧 Setting up DNS records for ${serviceName} service...`);
            
            const subdomain = `${serviceName}.${domain}`;
            
            // Create A record pointing to the server
            await this.upsertDNSRecord('A', subdomain, serverIP, 300, false);
            
            // Create CNAME record for www subdomain (optional)
            await this.upsertDNSRecord('CNAME', `www.${subdomain}`, subdomain, 300, false);
            
            console.log(`✅ DNS setup completed for ${serviceName} service`);
            console.log(`   - ${subdomain} -> ${serverIP}`);
            console.log(`   - www.${subdomain} -> ${subdomain}`);
            
            return {
                service: serviceName,
                domain: subdomain,
                ip: serverIP,
                records: [
                    { type: 'A', name: subdomain, content: serverIP },
                    { type: 'CNAME', name: `www.${subdomain}`, content: subdomain }
                ]
            };
        } catch (error) {
            console.error(`❌ Failed to setup DNS for ${serviceName}:`, error.message);
            throw error;
        }
    }
}

// CLI functionality
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log(`
Usage: node cloudflare-dns.js <command> [options]

Commands:
  verify                           - Verify API token
  list [type] [name]              - List DNS records
  create <type> <name> <content>  - Create DNS record
  update <id> <type> <name> <content> - Update DNS record
  delete <id>                     - Delete DNS record
  upsert <type> <name> <content>  - Create or update DNS record
  setup-webhook <service> <ip> <domain> - Setup webhook service DNS

Environment Variables:
  CLOUDFLARE_TOKEN - Cloudflare API token
  CLOUDFLARE_ZONE_ID - Cloudflare zone ID
        `);
        process.exit(1);
    }

    const token = process.env.CLOUDFLARE_TOKEN;
    const zoneId = process.env.CLOUDFLARE_ZONE_ID;

    if (!token) {
        console.error('❌ CLOUDFLARE_TOKEN environment variable is required');
        process.exit(1);
    }

    if (!zoneId) {
        console.error('❌ CLOUDFLARE_ZONE_ID environment variable is required');
        process.exit(1);
    }

    const dns = new CloudflareDNSManager(token, zoneId);
    const command = args[0];

    try {
        switch (command) {
            case 'verify':
                await dns.verifyToken();
                break;
            
            case 'list':
                const records = await dns.listDNSRecords(args[1], args[2]);
                console.log(JSON.stringify(records, null, 2));
                break;
            
            case 'create':
                if (args.length < 4) {
                    console.error('❌ Usage: create <type> <name> <content>');
                    process.exit(1);
                }
                await dns.createDNSRecord(args[1], args[2], args[3]);
                break;
            
            case 'update':
                if (args.length < 5) {
                    console.error('❌ Usage: update <id> <type> <name> <content>');
                    process.exit(1);
                }
                await dns.updateDNSRecord(args[1], args[2], args[3], args[4]);
                break;
            
            case 'delete':
                if (args.length < 2) {
                    console.error('❌ Usage: delete <id>');
                    process.exit(1);
                }
                await dns.deleteDNSRecord(args[1]);
                break;
            
            case 'upsert':
                if (args.length < 4) {
                    console.error('❌ Usage: upsert <type> <name> <content>');
                    process.exit(1);
                }
                await dns.upsertDNSRecord(args[1], args[2], args[3]);
                break;
            
            case 'setup-webhook':
                if (args.length < 4) {
                    console.error('❌ Usage: setup-webhook <service> <ip> <domain>');
                    process.exit(1);
                }
                const result = await dns.setupWebhookServiceDNS(args[1], args[2], args[3]);
                console.log('\n📋 DNS Setup Summary:');
                console.log(JSON.stringify(result, null, 2));
                break;
            
            default:
                console.error(`❌ Unknown command: ${command}`);
                process.exit(1);
        }
    } catch (error) {
        console.error(`❌ Command failed: ${error.message}`);
        process.exit(1);
    }
}

// Export for use as module
module.exports = CloudflareDNSManager;

// Run CLI if called directly
if (require.main === module) {
    main();
} 