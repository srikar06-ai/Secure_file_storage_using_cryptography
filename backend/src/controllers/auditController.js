/**
 * Audit Log REST Controller
 * Module: src/controllers/auditController.js
 *
 * Handles: user audit logs, file audit logs, admin system logs
 */

const auditService = require('../services/auditService');
const { sendSuccess } = require('../utils/responseUtils');

/**
 * Get audit logs for the authenticated user (their own activity)
 * GET /api/audit/me
 * Query: ?page=1&limit=50&action=UPLOAD&status=success&fromDate=&toDate=
 */
async function getMyLogs(req, res, next) {
  try {
    const { page = 1, limit = 50, action, status, fromDate, toDate } = req.query;

    const result = await auditService.getUserAuditLogs({
      targetUserId: req.user._id,
      requestingUser: req.user,
      page: Number(page),
      limit: Number(limit),
      action,
      status,
      fromDate,
      toDate
    });

    return sendSuccess(res, 'Your security audit logs retrieved successfully.', result, 200);
  } catch (error) {
    return next(error);
  }
}

/**
 * Get audit activity summary for the authenticated user
 * GET /api/audit/me/summary
 */
async function getMySummary(req, res, next) {
  try {
    const summary = await auditService.getUserAuditSummary(req.user._id);
    return sendSuccess(res, 'Audit activity summary retrieved.', summary, 200);
  } catch (error) {
    return next(error);
  }
}

/**
 * Get audit logs for a specific file (owner or admin)
 * GET /api/audit/file/:fileId
 * Query: ?page=1&limit=50
 */
async function getFileLogs(req, res, next) {
  try {
    const { fileId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const result = await auditService.getFileAuditLogs({
      fileId,
      requestingUser: req.user,
      page: Number(page),
      limit: Number(limit)
    });

    return sendSuccess(res, 'File audit logs retrieved successfully.', result, 200);
  } catch (error) {
    return next(error);
  }
}

/**
 * Admin-only: Get system-wide audit logs with rich filtering
 * GET /api/audit/system
 * Query: ?page=1&limit=100&action=&status=&userId=&fromDate=&toDate=
 */
async function getSystemLogs(req, res, next) {
  try {
    const { page = 1, limit = 100, action, status, userId, fromDate, toDate } = req.query;

    const result = await auditService.getSystemAuditLogs({
      requestingUser: req.user,
      page: Number(page),
      limit: Number(limit),
      action,
      status,
      userId,
      fromDate,
      toDate
    });

    return sendSuccess(res, 'System-wide audit logs retrieved.', result, 200);
  } catch (error) {
    return next(error);
  }
}

/**
 * Admin-only: Get audit logs for a specific user
 * GET /api/audit/users/:userId
 * Query: ?page=1&limit=50&action=&status=&fromDate=&toDate=
 */
async function getUserLogs(req, res, next) {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50, action, status, fromDate, toDate } = req.query;

    const result = await auditService.getUserAuditLogs({
      targetUserId: userId,
      requestingUser: req.user,
      page: Number(page),
      limit: Number(limit),
      action,
      status,
      fromDate,
      toDate
    });

    return sendSuccess(res, `Audit logs for user ${userId} retrieved.`, result, 200);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getMyLogs,
  getMySummary,
  getFileLogs,
  getSystemLogs,
  getUserLogs
};
