/**
 * User Routes
 * Module: src/routes/userRoutes.js
 *
 * Self-service profile management and admin user management endpoints.
 */

const express = require('express');
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

const router = express.Router();

// ─── Self-service routes (any authenticated user) ─────────────────────────────

/**
 * @route   GET /api/users/me
 * @desc    Get authenticated user's own profile
 * @access  Protected
 */
router.get('/me', authenticate, userController.getProfile);

/**
 * @route   PUT /api/users/me/password
 * @desc    Change authenticated user's own password
 * @body    { currentPassword, newPassword }
 * @access  Protected
 */
router.put('/me/password', authenticate, userController.changePassword);

// ─── Admin-only routes ────────────────────────────────────────────────────────

/**
 * @route   GET /api/users
 * @desc    List all users (paginated, searchable, filterable)
 * @query   page, limit, search, role, status
 * @access  Protected + Admin
 */
router.get('/', authenticate, requireRole('admin'), userController.listUsers);

/**
 * @route   GET /api/users/:userId
 * @desc    Get a specific user by ID
 * @access  Protected + Admin
 */
router.get('/:userId', authenticate, requireRole('admin'), userController.getUserById);

/**
 * @route   PATCH /api/users/:userId
 * @desc    Update a user's role or status
 * @body    { role?, status? }
 * @access  Protected + Admin
 */
router.patch('/:userId', authenticate, requireRole('admin'), userController.updateUser);

/**
 * @route   POST /api/users/:userId/unlock
 * @desc    Unlock a locked user account (clear lockout state)
 * @access  Protected + Admin
 */
router.post('/:userId/unlock', authenticate, requireRole('admin'), userController.unlockUser);

module.exports = router;
