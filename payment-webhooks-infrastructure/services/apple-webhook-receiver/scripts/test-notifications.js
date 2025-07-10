#!/usr/bin/env node

/**
 * Test script for Apple App Store Server Notifications Test API
 * 
 * This script tests the test notification functionality locally.
 * Make sure to set up your environment variables before running.
 * 
 * Usage: node test-notifications.js
 */

const axios = require('axios');

// Configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const WEBHOOK_SECRET = process.env.APP_STORE_WEBHOOK_SECRET || 'test-secret';

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testHealthEndpoint() {
    log('\n🔍 Testing Health Endpoint...', 'cyan');
    
    try {
        const response = await axios.get(`${BASE_URL}/health`);
        log(`✅ Health check passed: ${response.data.status}`, 'green');
        return true;
    } catch (error) {
        log(`❌ Health check failed: ${error.message}`, 'red');
        return false;
    }
}

async function testRootEndpoint() {
    log('\n🔍 Testing Root Endpoint...', 'cyan');
    
    try {
        const response = await axios.get(`${BASE_URL}/`);
        log(`✅ Root endpoint working`, 'green');
        log(`   Service: ${response.data.service}`, 'blue');
        log(`   Version: ${response.data.version}`, 'blue');
        log(`   Endpoints: ${Object.keys(response.data.endpoints).join(', ')}`, 'blue');
        return true;
    } catch (error) {
        log(`❌ Root endpoint failed: ${error.message}`, 'red');
        return false;
    }
}

async function testRequestNotification() {
    log('\n🔍 Testing Request Test Notification...', 'cyan');
    
    try {
        const response = await axios.post(`${BASE_URL}/test/request-notification`, {}, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.data.status === 'success') {
            log(`✅ Test notification requested successfully`, 'green');
            log(`   Token: ${response.data.testNotificationToken}`, 'blue');
            log(`   Environment: ${response.data.environment}`, 'blue');
            return response.data.testNotificationToken;
        } else {
            log(`❌ Test notification request failed: ${response.data.message}`, 'red');
            return null;
        }
    } catch (error) {
        log(`❌ Test notification request failed: ${error.message}`, 'red');
        if (error.response?.data) {
            log(`   Error details: ${JSON.stringify(error.response.data, null, 2)}`, 'yellow');
        }
        return null;
    }
}

async function testNotificationStatus(token) {
    if (!token) {
        log('⚠️  Skipping status check - no token available', 'yellow');
        return false;
    }
    
    log('\n🔍 Testing Notification Status Check...', 'cyan');
    
    try {
        const response = await axios.get(`${BASE_URL}/test/notification-status/${token}`);
        
        if (response.data.status === 'success') {
            log(`✅ Notification status retrieved successfully`, 'green');
            log(`   Token: ${response.data.testNotificationToken}`, 'blue');
            log(`   Status: ${JSON.stringify(response.data.notificationStatus, null, 2)}`, 'blue');
            return true;
        } else {
            log(`❌ Notification status check failed: ${response.data.message}`, 'red');
            return false;
        }
    } catch (error) {
        log(`❌ Notification status check failed: ${error.message}`, 'red');
        if (error.response?.data) {
            log(`   Error details: ${JSON.stringify(error.response.data, null, 2)}`, 'yellow');
        }
        return false;
    }
}

async function testWebhookEndpoint() {
    log('\n🔍 Testing Webhook Endpoint...', 'cyan');
    
    try {
        const testPayload = {
            data: {
                type: 'PING'
            }
        };
        
        const response = await axios.post(`${BASE_URL}/webhook/app-store-connect`, testPayload, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.data.status === 'success') {
            log(`✅ Webhook endpoint working`, 'green');
            log(`   Event type: ${response.data.eventType}`, 'blue');
            return true;
        } else {
            log(`❌ Webhook endpoint failed: ${response.data.message}`, 'red');
            return false;
        }
    } catch (error) {
        log(`❌ Webhook endpoint failed: ${error.message}`, 'red');
        return false;
    }
}

async function checkRequiredEnvironmentVariables() {
    log('\n🔍 Checking Environment Variables...', 'cyan');
    
    const requiredVars = [
        'APP_STORE_SERVER_API_KEY_ID',
        'APP_STORE_SERVER_API_ISSUER_ID',
        'APP_STORE_SERVER_API_PRIVATE_KEY_PATH',
        'APP_STORE_BUNDLE_ID'
    ];
    
    const missingVars = [];
    
    for (const varName of requiredVars) {
        if (!process.env[varName]) {
            missingVars.push(varName);
        }
    }
    
    if (missingVars.length > 0) {
        log(`⚠️  Missing required environment variables:`, 'yellow');
        missingVars.forEach(varName => {
            log(`   - ${varName}`, 'yellow');
        });
        log(`   Test notifications will not work without these variables.`, 'yellow');
        log(`   See TEST_NOTIFICATIONS.md for setup instructions.`, 'yellow');
        return false;
    } else {
        log(`✅ All required environment variables are set`, 'green');
        return true;
    }
}

async function main() {
    log('🚀 Starting Apple App Store Webhook Receiver Tests', 'bright');
    log(`   Base URL: ${BASE_URL}`, 'blue');
    
    const results = [];
    
    // Check environment variables
    const envCheck = await checkRequiredEnvironmentVariables();
    results.push({ test: 'Environment Variables', passed: envCheck });
    
    // Test basic endpoints
    const healthCheck = await testHealthEndpoint();
    results.push({ test: 'Health Endpoint', passed: healthCheck });
    
    const rootCheck = await testRootEndpoint();
    results.push({ test: 'Root Endpoint', passed: rootCheck });
    
    const webhookCheck = await testWebhookEndpoint();
    results.push({ test: 'Webhook Endpoint', passed: webhookCheck });
    
    // Test notification functionality (only if environment is configured)
    if (envCheck) {
        const notificationToken = await testRequestNotification();
        const notificationPassed = !!notificationToken;
        results.push({ test: 'Request Test Notification', passed: notificationPassed });
        
        if (notificationToken) {
            // Wait a moment before checking status
            log('\n⏳ Waiting 5 seconds before checking status...', 'yellow');
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            const statusCheck = await testNotificationStatus(notificationToken);
            results.push({ test: 'Notification Status Check', passed: statusCheck });
        }
    } else {
        log('\n⚠️  Skipping test notification tests - environment not configured', 'yellow');
    }
    
    // Summary
    log('\n📊 Test Results Summary:', 'bright');
    log('═'.repeat(50), 'blue');
    
    let passedCount = 0;
    let totalCount = results.length;
    
    results.forEach(result => {
        const status = result.passed ? '✅' : '❌';
        const color = result.passed ? 'green' : 'red';
        log(`${status} ${result.test}`, color);
        if (result.passed) passedCount++;
    });
    
    log('═'.repeat(50), 'blue');
    log(`Total: ${passedCount}/${totalCount} tests passed`, passedCount === totalCount ? 'green' : 'red');
    
    if (passedCount === totalCount) {
        log('\n🎉 All tests passed! Your webhook receiver is working correctly.', 'green');
    } else {
        log('\n⚠️  Some tests failed. Check the logs above for details.', 'yellow');
    }
    
    process.exit(passedCount === totalCount ? 0 : 1);
}

// Handle errors
process.on('unhandledRejection', (error) => {
    log(`❌ Unhandled error: ${error.message}`, 'red');
    process.exit(1);
});

// Run the tests
main().catch(error => {
    log(`❌ Test suite failed: ${error.message}`, 'red');
    process.exit(1);
}); 