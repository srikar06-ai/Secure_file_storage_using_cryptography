/**
 * Request Validation Middleware
 * Module: src/middleware/validationMiddleware.js
 * 
 * Intercepts incoming requests and validates bodies/params/queries against Joi schemas.
 * Strips unknown fields to prevent mass assignment and parameter pollution vulnerabilities.
 */

const { sendError } = require('../utils/responseUtils');

/**
 * Higher-order middleware factory for validating request bodies
 * @param {import('joi').ObjectSchema} schema - Joi validation schema
 */
function validateBody(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Collect all validation errors rather than stopping at the first
      stripUnknown: true, // Discard unexpected fields to prevent mass-assignment attacks
      convert: true // Coerce types where safe (e.g. string to number)
    });

    if (error) {
      const formattedErrors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/['"]/g, '')
      }));

      return sendError(
        res,
        'Validation failed for one or more input fields.',
        400,
        formattedErrors
      );
    }

    // Replace req.body with the sanitized and validated object
    req.body = value;
    return next();
  };
}

module.exports = {
  validateBody
};
