/**
 * Audit Log Service
 * Module: src/services/auditService.js
 *
 * Provides a centralized, structured interface for querying and retrieving
 * security audit events. All write operations are done inline in other services
 * for atomicity; this service handles READ and analytics operations.
 */

const mongoose = require('mongoose');
const { AuditLog } = require('../models');

// Maximum audit records returned in a single query
const MAX_RESULTS = 500;

/**
 * Retrieve paginated audit logs for a specific user (self or admin)
 *
 * @param {object} params
 * @param {string} params.targetUserId  - User ObjectId whose logs to fetch
 * @param {object} params.requestingUser - Authenticated user (must be owner or admin)
 * @param {number} [params.page=1]       - Page number (1-indexed)
 * @param {number} [params.limit=50]     - Records per page
 * @param {string} [params.action]       - Filter by action type (e.g. 'UPLOAD', 'DOWNLOAD')
 * @param {string} [params.status]       - Filter by status ('success' | 'failure')
 * @param {Date}   [params.fromDate]     - Start date filter (ISO string or Date)
 * @param {Date}   [params.toDate]       - End date filter (ISO string or Date)
 * @returns {Promise<{ logs: Array, pagination: object }>}
 */
async function getUserAuditLogs({
  targetUserId,
  requestingUser,
  page = 1,
  limit = 50,
  action,
  status,
  fromDate,
  toDate
}) {
  // Authorization: admins can view any user's logs; normal users can only view their own
  const isAdmin = requestingUser.role === 'admin';
  const isSelf = requestingUser._id.toString() === targetUserId.toString();

  if (!isAdmin && !isSelf) {
    const err = new Error('Access denied. You may only view your own audit logs.');
    err.statusCode = 403;
    throw err;
  }

  if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
    const err = new Error('Invalid user identifier format.');
    err.statusCode = 400;
    throw err;
  }

  // Build query filter
  const filter = { user: new mongoose.Types.ObjectId(targetUserId) };

  if (action) filter.action = action.toUpperCase();
  if (status) filter.status = status.toLowerCase();

  if (fromDate || toDate) {
    filter.createdAt = {};
    if (fromDate) filter.createdAt.$gte = new Date(fromDate);
    if (toDate) filter.createdAt.$lte = new Date(toDate);
  }

  // Clamp limit to MAX_RESULTS
  const clampedLimit = Math.min(Number(limit) || 50, MAX_RESULTS);
  const skip = (Math.max(Number(page), 1) - 1) * clampedLimit;

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .populate('file', 'originalName mimeType')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(clampedLimit)
      .lean(),
    AuditLog.countDocuments(filter)
  ]);

  return {
    logs,
    pagination: {
      page: Math.max(Number(page), 1),
      limit: clampedLimit,
      total,
      totalPages: Math.ceil(total / clampedLimit),
      hasNext: skip + logs.length < total,
      hasPrev: skip > 0
    }
  };
}

/**
 * Retrieve all audit events for a specific file (owner or admin only)
 *
 * @param {object} params
 * @param {string} params.fileId - MongoDB ObjectId of the file
 * @param {object} params.requestingUser - Authenticated user
 * @param {number} [params.page=1]
 * @param {number} [params.limit=50]
 * @returns {Promise<{ logs: Array, pagination: object }>}
 */
async function getFileAuditLogs({ fileId, requestingUser, page = 1, limit = 50 }) {
  if (!mongoose.Types.ObjectId.isValid(fileId)) {
    const err = new Error('Invalid file identifier format.');
    err.statusCode = 400;
    throw err;
  }

  const { File } = require('../models');
  const file = await File.findById(fileId);

  if (!file) {
    const err = new Error('File not found.');
    err.statusCode = 404;
    throw err;
  }

  const isAdmin = requestingUser.role === 'admin';
  const isOwner = file.owner.toString() === requestingUser._id.toString();

  if (!isAdmin && !isOwner) {
    const err = new Error('Access denied. Only the file owner or an admin can view file audit logs.');
    err.statusCode = 403;
    throw err;
  }

  const clampedLimit = Math.min(Number(limit) || 50, MAX_RESULTS);
  const skip = (Math.max(Number(page), 1) - 1) * clampedLimit;

  const filter = { file: new mongoose.Types.ObjectId(fileId) };

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .populate('user', 'username email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(clampedLimit)
      .lean(),
    AuditLog.countDocuments(filter)
  ]);

  return {
    logs,
    pagination: {
      page: Math.max(Number(page), 1),
      limit: clampedLimit,
      total,
      totalPages: Math.ceil(total / clampedLimit),
      hasNext: skip + logs.length < total,
      hasPrev: skip > 0
    }
  };
}

/**
 * Admin-only: Retrieve system-wide audit logs with rich filtering
 *
 * @param {object} params
 * @param {object} params.requestingUser - Must be admin role
 * @param {number} [params.page=1]
 * @param {number} [params.limit=100]
 * @param {string} [params.action]   - Filter by action
 * @param {string} [params.status]   - Filter by status
 * @param {string} [params.userId]   - Filter by user ObjectId
 * @param {Date}   [params.fromDate]
 * @param {Date}   [params.toDate]
 * @returns {Promise<{ logs: Array, pagination: object }>}
 */
async function getSystemAuditLogs({
  requestingUser,
  page = 1,
  limit = 100,
  action,
  status,
  userId,
  fromDate,
  toDate
}) {
  if (requestingUser.role !== 'admin') {
    const err = new Error('Access denied. Administrator privileges required.');
    err.statusCode = 403;
    throw err;
  }

  const filter = {};

  if (action) filter.action = action.toUpperCase();
  if (status) filter.status = status.toLowerCase();

  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    filter.user = new mongoose.Types.ObjectId(userId);
  }

  if (fromDate || toDate) {
    filter.createdAt = {};
    if (fromDate) filter.createdAt.$gte = new Date(fromDate);
    if (toDate) filter.createdAt.$lte = new Date(toDate);
  }

  const clampedLimit = Math.min(Number(limit) || 100, MAX_RESULTS);
  const skip = (Math.max(Number(page), 1) - 1) * clampedLimit;

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .populate('user', 'username email role')
      .populate('file', 'originalName mimeType')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(clampedLimit)
      .lean(),
    AuditLog.countDocuments(filter)
  ]);

  return {
    logs,
    pagination: {
      page: Math.max(Number(page), 1),
      limit: clampedLimit,
      total,
      totalPages: Math.ceil(total / clampedLimit),
      hasNext: skip + logs.length < total,
      hasPrev: skip > 0
    }
  };
}

/**
 * Get a summary count of audit events grouped by action type for a user
 * @param {string} userId - MongoDB ObjectId
 * @returns {Promise<Array<{ action: string, count: number }>>}
 */
async function getUserAuditSummary(userId) {
  const summary = await AuditLog.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId) } },
    { $group: { _id: { action: '$action', status: '$status' }, count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  return summary.map(({ _id, count }) => ({
    action: _id.action,
    status: _id.status,
    count
  }));
}

module.exports = {
  getUserAuditLogs,
  getFileAuditLogs,
  getSystemAuditLogs,
  getUserAuditSummary
};
