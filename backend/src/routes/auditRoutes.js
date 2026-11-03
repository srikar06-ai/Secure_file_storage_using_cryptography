/**
 * Audit Log Routes
 * Module: src/routes/auditRoutes.js
 *
 * Provides structured access to security audit event logs.
 * Enforces authentication + role-based access on sensitive system-wide queries.
 */

const express = require('express');
const auditController = require('../controllers/auditController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

const router = express.Router();

/**
 * @route   GET /api/audit/me
 * @desc    Get security audit logs for the authenticated user (self-service)
 * @query   page, limit, action, status, fromDate, toDate
 * @access  Protected
 */
router.get('/me', authenticate, auditController.getMyLogs);

/**
 * @route   GET /api/audit/me/summary
 * @desc    Get a count summary of the authenticated user's audit events by action
 * @access  Protected
 */
router.get('/me/summary', authenticate, auditController.getMySummary);

/**
 * @route   GET /api/audit/file/:fileId
 * @desc    Get all audit events for a specific file (owner or admin)
 * @query   page, limit
 * @access  Protected (file owner or admin)
 */
router.get('/file/:fileId', authenticate, auditController.getFileLogs);

/**
 * @route   GET /api/audit/system
 * @desc    Admin-only: System-wide audit event log with full filtering
 * @query   page, limit, action, status, userId, fromDate, toDate
 * @access  Protected + Admin
 */
router.get('/system', authenticate, requireRole('admin'), auditController.getSystemLogs);

/**
 * @route   GET /api/audit/users/:userId
 * @desc    Admin-only: Retrieve audit logs for a specific user
 * @query   page, limit, action, status, fromDate, toDate
 * @access  Protected + Admin
 */
router.get('/users/:userId', authenticate, requireRole('admin'), auditController.getUserLogs);

module.exports = router;
