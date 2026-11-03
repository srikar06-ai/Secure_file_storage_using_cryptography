/**
 * Role-Based Access Control (RBAC) Middleware
 * Module: src/middleware/roleMiddleware.js
 *
 * Enforces role requirements on protected routes.
 * Must be used AFTER the `authenticate` middleware, which populates req.user.
 *
 * Usage:
 *   router.delete('/files/:id/purge', authenticate, requireRole('admin'), fileController.purge);
 *   router.get('/audit/system', authenticate, requireRole('admin'), auditController.getSystem);
 */

const { sendError } = require('../utils/responseUtils');

/**
 * Creates a middleware function that enforces one or more allowed roles.
 *
 * @param {...string} roles - Allowed roles (e.g., 'admin', 'user')
 * @returns {Function} Express middleware
 */
function requireRole(...roles) {
  return function (req, res, next) {
    // Safety check: authenticate must have run first
    if (!req.user) {
      return sendError(
        res,
        'Authentication required. Please log in before accessing this resource.',
        401
      );
    }

    if (!roles.includes(req.user.role)) {
      return sendError(
        res,
        `Access denied. This action requires one of the following roles: [${roles.join(', ')}]. Your role: ${req.user.role}.`,
        403
      );
    }

    return next();
  };
}

/**
 * Middleware that allows admins to bypass normal authorization checks.
 * Attaches req.isAdmin = true for downstream use when role is 'admin'.
 */
function flagAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    req.isAdmin = true;
  }
  return next();
}

module.exports = {
  requireRole,
  flagAdmin
};
