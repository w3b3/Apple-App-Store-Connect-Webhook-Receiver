# Apple App Store Server Notifications Testing

This document describes how to test Apple App Store Server Notifications using the built-in test notification functionality.

## Overview

Apple provides a "Request a Test Notification" API that allows you to trigger test notifications to verify your webhook endpoint is working correctly. This is particularly useful for testing your server notification handling without requiring actual in-app purchases.

## Configuration

### Required Environment Variables

Add these variables to your `.env` file:

```bash
# App Store Server API Configuration (for test notifications)
APP_STORE_SERVER_API_KEY_ID=your-key-id-here
APP_STORE_SERVER_API_ISSUER_ID=your-issuer-id-here
APP_STORE_SERVER_API_PRIVATE_KEY_PATH=/opt/webhook-receiver/AuthKey_XXXXXXXXXX.p8
APP_STORE_BUNDLE_ID=com.yourcompany.yourapp
```

### Setting Up App Store Server API Credentials

1. **Create an App Store Connect API Key:**
   - Go to [App Store Connect](https://appstoreconnect.apple.com)
   - Navigate to Users and Access → Keys
   - Click the "+" button to create a new key
   - Select "App Manager" or "Developer" role
   - Download the `.p8` private key file
   - Note the Key ID and Issuer ID

2. **Configure the Private Key:**
   - Upload the `.p8` file to your server
   - Set the path in `APP_STORE_SERVER_API_PRIVATE_KEY_PATH`
   - Ensure the file has proper permissions (600)

3. **Bundle ID:**
   - Use your app's bundle identifier (e.g., `com.yourcompany.yourapp`)

## API Endpoints

### Request Test Notification

**POST** `/test/request-notification`

Requests a test notification from Apple's servers.

**Example Request:**
```bash
curl -X POST https://your-webhook-domain.com/test/request-notification \
  -H "Content-Type: application/json"
```

**Success Response:**
```json
{
  "status": "success",
  "message": "Test notification requested successfully",
  "testNotificationToken": "abc123def456",
  "environment": "sandbox",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "instructions": {
    "checkStatus": "GET /test/notification-status/abc123def456",
    "note": "The test notification should arrive at your webhook endpoint within a few minutes"
  }
}
```

**Error Response:**
```json
{
  "status": "error",
  "message": "Failed to request test notification",
  "error": "Invalid bundle ID",
  "environment": "sandbox",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Check Test Notification Status

**GET** `/test/notification-status/:token`

Checks the status of a previously requested test notification.

**Example Request:**
```bash
curl https://your-webhook-domain.com/test/notification-status/abc123def456
```

**Response:**
```json
{
  "status": "success",
  "message": "Test notification status retrieved successfully",
  "testNotificationToken": "abc123def456",
  "notificationStatus": {
    "sendAttempts": [
      {
        "attemptDate": "2024-01-15T10:31:00.000Z",
        "sendAttemptResult": "SUCCESS"
      }
    ]
  },
  "environment": "sandbox",
  "timestamp": "2024-01-15T10:35:00.000Z"
}
```

## Testing Workflow

1. **Request a Test Notification:**
   ```bash
   curl -X POST https://your-webhook-domain.com/test/request-notification
   ```

2. **Save the Test Notification Token:**
   - The response will include a `testNotificationToken`
   - Use this token to check the status later

3. **Wait for the Notification:**
   - Test notifications typically arrive within 1-5 minutes
   - Check your webhook endpoint logs for incoming notifications

4. **Check Status (Optional):**
   ```bash
   curl https://your-webhook-domain.com/test/notification-status/YOUR_TOKEN
   ```

5. **Verify Webhook Processing:**
   - Check your server logs for the received notification
   - Verify the notification was processed correctly
   - Check Firestore (if enabled) for stored notification data

## Test Notification Format

Test notifications will arrive at your `/webhook/app-store-server-notifications` endpoint with the following structure:

```json
{
  "signedPayload": "eyJhbGciOiJFUzI1NiIsIng1YyI6W..."
}
```

The `signedPayload` contains a JWT with test data that your webhook handler will process normally.

## Environments

- **Sandbox:** Used for development and testing
- **Production:** Used for live apps with real users

The environment is automatically determined based on your `NODE_ENV` setting:
- `NODE_ENV=production` → Production environment
- Any other value → Sandbox environment

## Troubleshooting

### Common Issues

1. **"Invalid bundle ID" Error:**
   - Ensure `APP_STORE_BUNDLE_ID` matches your app's bundle identifier
   - Verify the bundle ID exists in App Store Connect

2. **"Authentication Failed" Error:**
   - Check your API key credentials
   - Ensure the private key file is readable
   - Verify the Key ID and Issuer ID are correct

3. **"File Not Found" Error:**
   - Check the path to your `.p8` private key file
   - Ensure the file exists and has proper permissions

4. **No Notification Received:**
   - Check your webhook endpoint is accessible from the internet
   - Verify SSL certificate is valid
   - Check server logs for any errors
   - Wait up to 10 minutes (Apple's servers may have delays)

### Debugging Steps

1. **Test JWT Creation:**
   - Check server logs for JWT creation errors
   - Verify environment variables are set correctly

2. **Check Apple's Response:**
   - Look for detailed error messages in the API response
   - Check the HTTP status code

3. **Verify Webhook Endpoint:**
   - Test your webhook endpoint manually
   - Ensure it returns a 200 status code
   - Check SSL certificate validity

## Security Considerations

- Keep your `.p8` private key file secure
- Use proper file permissions (600) for the private key
- Store sensitive environment variables securely
- Use HTTPS for all webhook endpoints
- Validate JWT signatures on received notifications

## Monitoring

The webhook receiver automatically logs:
- Test notification requests
- API responses from Apple
- Webhook processing results
- Any errors or failures

Monitor these logs to ensure your test notifications are working correctly. 