/**
 * Authentication Input Validation Schemas
 * Module: src/validators/authValidator.js
 * 
 * Defines strict Joi validation schemas for registration and login payloads.
 * Enforces strong password complexity and prevents malformed requests before hitting controllers.
 */

const Joi = require('joi');

const registerSchema = Joi.object({
  username: Joi.string()
    .trim()
    .min(3)
    .max(30)
    .pattern(/^[a-zA-Z0-9_-]+$/)
    .required()
    .messages({
      'string.base': 'Username must be a string.',
      'string.empty': 'Username is required.',
      'string.min': 'Username must be at least 3 characters long.',
      'string.max': 'Username cannot exceed 30 characters.',
      'string.pattern.base': 'Username can only contain letters, numbers, underscores, and dashes.',
      'any.required': 'Username is a required field.'
    }),

  email: Joi.string()
    .trim()
    .lowercase()
    .email({ minDomainSegments: 2, tlds: { allow: true } })
    .required()
    .messages({
      'string.base': 'Email must be a string.',
      'string.empty': 'Email is required.',
      'string.email': 'Please provide a valid email address.',
      'any.required': 'Email is a required field.'
    }),

  password: Joi.string()
    .min(8)
    .max(72) // Bcrypt max length limit
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).*$/)
    .required()
    .messages({
      'string.base': 'Password must be a string.',
      'string.empty': 'Password is required.',
      'string.min': 'Password must be at least 8 characters long.',
      'string.max': 'Password cannot exceed 72 characters.',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
      'any.required': 'Password is a required field.'
    }),

  role: Joi.string()
    .valid('user', 'admin')
    .default('user')
    .messages({
      'any.only': 'Role must be either "user" or "admin".'
    })
});

const loginSchema = Joi.object({
  email: Joi.string()
    .trim()
    .lowercase()
    .email()
    .required()
    .messages({
      'string.empty': 'Email is required.',
      'string.email': 'Please provide a valid email address.',
      'any.required': 'Email is required.'
    }),

  password: Joi.string()
    .required()
    .messages({
      'string.empty': 'Password is required.',
      'any.required': 'Password is required.'
    })
});

module.exports = {
  registerSchema,
  loginSchema
};
