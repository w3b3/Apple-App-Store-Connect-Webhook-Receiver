const express = require('express');
const config = require('../config');

class Middleware {
    /**
     * Middleware to capture raw body for signature verification on webhook routes
     */
    static webhookRawBody() {
        return express.raw({ 
            type: 'application/json', 
            limit: config.constants.maxPayloadSize 
        });
    }

    /**
     * Middleware to parse JSON payloads for other routes
     */
    static jsonParser() {
        return express.json({ 
            limit: config.constants.maxPayloadSize 
        });
    }

    /**
     * Enhanced error response helper
     */
    static createErrorResponse(statusCode, message, details = null) {
        const response = {
            error: message,
            timestamp: new Date().toISOString(),
            status: statusCode
        };
        
        if (details && !config.isProduction()) {
            response.details = details;
        }
        
        return response;
    }

    /**
     * Error handling middleware
     */
    static errorHandler() {
        return (error, req, res, next) => {
            console.error('Unhandled error:', error);
            res.status(500).json(
                Middleware.createErrorResponse(500, 'Internal server error', error.message)
            );
        };
    }

    /**
     * 404 handler
     */
    static notFoundHandler() {
        return (req, res) => {
            res.status(404).json(
                Middleware.createErrorResponse(404, 'Endpoint not found', `Path ${req.originalUrl} not found`)
            );
        };
    }

    /**
     * Request logging middleware
     */
    static requestLogger() {
        return (req, res, next) => {
            console.log(`${req.method} ${req.path} - ${req.ip}`);
            next();
        };
    }

    /**
     * Extract metadata from request
     */
    static extractRequestMetadata(req) {
        return {
            userAgent: req.headers['user-agent'],
            contentType: req.headers['content-type'],
            timestamp: new Date().toISOString(),
            ip: req.ip,
            path: req.path,
            method: req.method
        };
    }
}

module.exports = Middleware; 