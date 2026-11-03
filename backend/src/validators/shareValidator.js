/**
 * Share Request Validation Schemas
 * Module: src/validators/shareValidator.js
 *
 * Joi schemas for validating file sharing request bodies.
 */

const Joi = require('joi');

/**
 * Schema for creating a new share grant
 * POST /api/shares
 */
const createShareSchema = Joi.object({
  fileId: Joi.string()
    .pattern(/^[a-f\d]{24}$/i)
    .required()
    .messages({
      'string.pattern.base': 'fileId must be a valid MongoDB ObjectId.',
      'any.required': 'fileId is required to create a share grant.'
    }),

  recipientEmail: Joi.string()
    .email({ tlds: { allow: false } })
    .lowercase()
    .trim()
    .optional()
    .messages({
      'string.email': 'recipientEmail must be a valid email address.'
    }),

  permission: Joi.string()
    .valid('read', 'download')
    .default('read')
    .messages({
      'any.only': 'permission must be either "read" or "download".'
    }),

  expiresInHours: Joi.number()
    .integer()
    .min(1)
    .max(8760) // 1 year max
    .optional()
    .allow(null)
    .messages({
      'number.min': 'expiresInHours must be at least 1 hour.',
      'number.max': 'expiresInHours cannot exceed 8760 hours (1 year).'
    })
}).options({ stripUnknown: true });

/**
 * Schema for verifying a share token
 * POST /api/shares/verify
 */
const verifyTokenSchema = Joi.object({
  token: Joi.string()
    .trim()
    .min(20)
    .required()
    .messages({
      'any.required': 'Share token is required.',
      'string.min': 'Share token format is invalid.'
    })
});

module.exports = {
  createShareSchema,
  verifyTokenSchema
};
