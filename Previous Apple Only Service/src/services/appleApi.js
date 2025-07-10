const axios = require('axios');
const config = require('../config');
const authService = require('../auth');

class AppleApiService {
    /**
     * Request a test notification from App Store Server API
     */
    async requestTestNotification() {
        try {
            const token = authService.createAppStoreServerAPIJWT();
            const environment = config.isProduction() ? 'production' : 'sandbox';
            
            const url = config.getTestNotificationUrl();

            const response = await axios.post(url, {}, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                timeout: config.constants.requestTimeout
            });

            return {
                success: true,
                testNotificationToken: response.data.testNotificationToken,
                environment: environment,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Failed to request test notification:', error);
            
            let errorMessage = 'Unknown error';
            let statusCode = 500;
            
            if (error.response) {
                errorMessage = error.response.data?.errorMessage || error.response.statusText || 'API request failed';
                statusCode = error.response.status;
            } else if (error.request) {
                errorMessage = 'No response received from Apple servers';
            } else {
                errorMessage = error.message;
            }

            return {
                success: false,
                error: errorMessage,
                statusCode: statusCode,
                environment: config.isProduction() ? 'production' : 'sandbox',
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Get test notification status from App Store Server API
     */
    async getTestNotificationStatus(testNotificationToken) {
        try {
            const token = authService.createAppStoreServerAPIJWT();
            const environment = config.isProduction() ? 'production' : 'sandbox';
            
            const url = config.getTestNotificationUrl(testNotificationToken);

            const response = await axios.get(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                timeout: config.constants.requestTimeout
            });

            return {
                success: true,
                status: response.data,
                environment: environment,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Failed to get test notification status:', error);
            
            let errorMessage = 'Unknown error';
            let statusCode = 500;
            
            if (error.response) {
                errorMessage = error.response.data?.errorMessage || error.response.statusText || 'API request failed';
                statusCode = error.response.status;
            } else if (error.request) {
                errorMessage = 'No response received from Apple servers';
            } else {
                errorMessage = error.message;
            }

            return {
                success: false,
                error: errorMessage,
                statusCode: statusCode,
                environment: config.isProduction() ? 'production' : 'sandbox',
                timestamp: new Date().toISOString()
            };
        }
    }
}

module.exports = new AppleApiService(); 