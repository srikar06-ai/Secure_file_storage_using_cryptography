/**
 * Authentication Route Handlers
 * Module: src/routes/authRoutes.js
 * 
 * Defines routing endpoints for registration, login, logout, and profile access.
 * Applies rate limiting, input validation, and JWT authentication guards.
 */

const express = require('express');
const authController = require('../controllers/authController');
const { authLimiter } = require('../middleware/rateLimitMiddleware');
const { validateBody } = require('../middleware/validationMiddleware');
const { authenticate } = require('../middleware/authMiddleware');
const { registerSchema, loginSchema } = require('../validators/authValidator');

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user account
 * @access  Public (Throttled by authLimiter)
 */
router.post(
  '/register',
  authLimiter,
  validateBody(registerSchema),
  authController.register
);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate credentials and issue JWT
 * @access  Public (Throttled by authLimiter)
 */
router.post(
  '/login',
  authLimiter,
  validateBody(loginSchema),
  authController.login
);

/**
 * @route   POST /api/auth/logout
 * @desc    Client session termination
 * @access  Protected
 */
router.post(
  '/logout',
  authenticate,
  authController.logout
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user profile
 * @access  Protected
 */
router.get(
  '/me',
  authenticate,
  authController.getMe
);

module.exports = router;
