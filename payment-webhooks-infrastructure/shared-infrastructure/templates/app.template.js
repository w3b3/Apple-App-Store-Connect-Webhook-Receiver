const express = require('express');
const config = require('./config');
const Middleware = require('./middleware');
const routes = require('./routes');

// Initialize Express app
const app = express();

// Request logging middleware
app.use(Middleware.requestLogger());

// Middleware to capture raw body for signature verification on webhook routes
app.use('/webhook', Middleware.webhookRawBody());

// Middleware to parse JSON payloads for other routes
app.use(Middleware.jsonParser());

// Routes
app.use('/', routes);

// Error handling middleware
app.use(Middleware.errorHandler());

// 404 handler
app.use('*', Middleware.notFoundHandler());

// Start server
const server = app.listen(config.port, () => {
    console.log(`${config.service.name} started`);
    console.log(`Listening on port ${config.port}`);
    console.log(`Health check: http://localhost:${config.port}/health`);
    console.log(`Webhook endpoint: http://localhost:${config.port}${config.service.webhookPath}`);
    console.log(`Environment: ${config.nodeEnv}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

module.exports = app; 