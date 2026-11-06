/**
 * File Routes - Complete CRUD + Admin Purge
 * Module: src/routes/fileRoutes.js (PHASE 3 REPLACEMENT)
 */

const express = require('express');
const fileController = require('../controllers/fileController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { uploadSingle } = require('../middleware/uploadMiddleware');

const router = express.Router();

// ─── All routes require JWT authentication ────────────────────────────────────

/**
 * @route   POST /api/files/upload
 * @desc    Encrypt and upload a file using AES-256-GCM Envelope Encryption
 * @access  Protected
 */
router.post('/upload', authenticate, uploadSingle, fileController.upload);

/**
 * @route   GET /api/files
 * @desc    List all files owned by the authenticated user (paginated)
 * @access  Protected
 * @query   page, limit, search
 */
router.get('/', authenticate, fileController.listFiles);

/**
 * @route   GET /api/files/trash/list
 * @desc    List all soft-deleted files
 * @access  Protected
 */
router.get('/trash/list', authenticate, fileController.listDeletedFiles);

/**
 * @route   POST /api/files/:id/restore
 * @desc    Restore a soft-deleted file
 * @access  Protected
 */
router.post('/:id/restore', authenticate, fileController.restoreFile);

/**
 * @route   GET /api/files/:id
 * @desc    Get metadata for a single file (owner or authorized share recipient)
 * @access  Protected
 */
router.get('/:id', authenticate, fileController.getFileMetadata);

/**
 * @route   GET /api/files/:id/download
 * @desc    Decrypt and download an authorized file
 * @access  Protected
 */
router.get('/:id/download', authenticate, fileController.download);

/**
 * @route   DELETE /api/files/:id
 * @desc    Soft-delete a file (owner or admin)
 * @access  Protected
 */
router.delete('/:id', authenticate, fileController.deleteFile);

/**
 * @route   DELETE /api/files/:id/purge
 * @desc    Permanently purge a soft-deleted file from disk and database (admin only)
 * @access  Protected + Admin
 */
router.delete('/:id/purge', authenticate, requireRole('admin'), fileController.purgeFile);

module.exports = router;
