/**
 * Standard API Response Utilities
 * Module: src/utils/responseUtils.js
 * 
 * Provides consistent, structured JSON responses for success and error states.
 */

/**
 * Standard success response
 * @param {import('express').Response} res - Express response object
 * @param {string} message - Human-readable success message
 * @param {object} [data=null] - Payload data
 * @param {number} [statusCode=200] - HTTP status code
 */
function sendSuccess(res, message, data = null, statusCode = 200) {
  const response = {
    success: true,
    message,
    timestamp: new Date().toISOString()
  };

  if (data !== null && data !== undefined) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
}

/**
 * Standard error response
 * @param {import('express').Response} res - Express response object
 * @param {string} message - Human-readable error message
 * @param {number} [statusCode=500] - HTTP status code
 * @param {Array|object} [errors=null] - Detailed validation or contextual errors
 */
function sendError(res, message, statusCode = 500, errors = null) {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString()
  };

  if (errors !== null && errors !== undefined) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
}

module.exports = {
  sendSuccess,
  sendError
};
