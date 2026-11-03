/**
 * Share Routes
 * Module: src/routes/shareRoutes.js
 *
 * Defines REST endpoints for secure, revocable file sharing.
 * All routes require JWT authentication.
 */

const express = require('express');
const shareController = require('../controllers/shareController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * @route   POST /api/shares
 * @desc    Create a new share grant for a file
 * @body    { fileId, recipientEmail?, permission?, expiresInHours? }
 * @access  Protected
 */
router.post('/', authenticate, shareController.createShare);

/**
 * @route   GET /api/shares/shared-with-me
 * @desc    List all files that have been shared with the authenticated user
 * @access  Protected
 * NOTE: This route must be defined BEFORE /:shareId to avoid route conflict
 */
router.get('/shared-with-me', authenticate, shareController.listSharedWithMe);

/**
 * @route   POST /api/shares/verify
 * @desc    Verify a share token and retrieve the associated file metadata
 * @body    { token }
 * @access  Protected
 */
router.post('/verify', authenticate, shareController.verifyToken);

/**
 * @route   GET /api/shares/file/:fileId
 * @desc    List all shares created by the authenticated user for a specific file
 * @access  Protected
 */
router.get('/file/:fileId', authenticate, shareController.listFileShares);

/**
 * @route   DELETE /api/shares/:shareId
 * @desc    Revoke an existing share grant (owner only)
 * @access  Protected
 */
router.delete('/:shareId', authenticate, shareController.revokeShare);

module.exports = router;
