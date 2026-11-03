/**
 * Rate Limiting Middleware
 * Module: src/middleware/rateLimitMiddleware.js
 * 
 * Protects APIs against brute-force attacks and volumetric abuse.
 */

const rateLimit = require('express-rate-limit');
const { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS, NODE_ENV } = require('../config/env');
const { sendError } = require('../utils/responseUtils');

/**
 * Global rate limiter for standard API endpoints
 */
const apiLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true, // Return standard RateLimit headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  handler: (req, res) => {
    return sendError(
      res,
      'Too many requests received from this IP address. Please try again later.',
      429
    );
  },
  skip: () => NODE_ENV === 'test' // Disable in test environment to avoid flaky test suites
});

/**
 * Stricter rate limiter for sensitive authentication endpoints (login, register)
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Max 15 attempts per 15-minute window
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return sendError(
      res,
      'Too many authentication attempts. Account access is temporarily throttled for security. Please try again after 15 minutes.',
      429
    );
  },
  skip: () => NODE_ENV === 'test'
});

module.exports = {
  apiLimiter,
  authLimiter
};
