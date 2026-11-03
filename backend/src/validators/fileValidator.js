/**
 * File Upload & Query Validation Schemas
 * Module: src/validators/fileValidator.js
 *
 * Joi schemas for validating file-related request parameters and query strings.
 */

const Joi = require('joi');

/**
 * Query parameter schema for file listing
 * GET /api/files?page=1&limit=20&search=report
 */
const listFilesSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
    'number.base': 'Page must be a number.',
    'number.min': 'Page must be at least 1.'
  }),
  limit: Joi.number().integer().min(1).max(100).default(20).messages({
    'number.max': 'Limit cannot exceed 100 per page.'
  }),
  search: Joi.string().trim().max(255).optional().allow('').messages({
    'string.max': 'Search term cannot exceed 255 characters.'
  })
});

/**
 * Validates a MongoDB ObjectId path parameter
 */
const objectIdParamSchema = Joi.object({
  id: Joi.string()
    .pattern(/^[a-f\d]{24}$/i)
    .required()
    .messages({
      'string.pattern.base': 'The provided ID is not a valid MongoDB ObjectId.',
      'any.required': 'File ID is required.'
    })
});

module.exports = {
  listFilesSchema,
  objectIdParamSchema
};
