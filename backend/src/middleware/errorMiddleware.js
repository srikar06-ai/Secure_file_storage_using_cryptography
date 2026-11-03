/**
 * Error Handling Middleware
 * Module: src/middleware/errorMiddleware.js
 * 
 * Provides centralized error interception and formatted JSON responses.
 * Guarantees no sensitive stack traces are exposed in production.
 */

const { NODE_ENV } = require('../config/env');
const { sendError } = require('../utils/responseUtils');

/**
 * 404 Not Found Middleware
 */
function notFoundHandler(req, res, next) {
  const error = new Error(`Resource not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

/**
 * Global Centralized Error Handler
 */
function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);
  let message = err.message || 'An unexpected internal server error occurred.';

  // Handle malformed JSON request bodies
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    message = 'Malformed JSON payload provided in request body.';
  }

  // Handle Mongoose CastError (e.g. invalid ObjectId format)
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    statusCode = 400;
    message = `Invalid resource identifier format for '${err.path}'.`;
  }

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed for one or more fields.';
  }

  // Log server errors for observability (excluding 404s and client validation errors)
  if (statusCode >= 500) {
    console.error(`\n🚨 [ServerError] ${req.method} ${req.originalUrl}:`, err);
  }

  const responsePayload = {
    success: false,
    message,
    timestamp: new Date().toISOString()
  };

  if (err.errors) {
    responsePayload.errors = err.errors;
  }

  // Include stack trace only in development/debugging mode
  if (NODE_ENV === 'development') {
    responsePayload.stack = err.stack;
  }

  return res.status(statusCode).json(responsePayload);
}

module.exports = {
  notFoundHandler,
  errorHandler
};
