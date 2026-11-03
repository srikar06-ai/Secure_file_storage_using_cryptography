/**
 * JWT Authentication & Identity Middleware
 * Module: src/middleware/authMiddleware.js
 * 
 * Verifies JWT access tokens, validates user existence, enforces account lockout checks,
 * and attaches the authenticated user document to the Express request context.
 */

const { verifyToken } = require('../utils/tokenUtils');
const { sendError } = require('../utils/responseUtils');
const { User } = require('../models');

/**
 * Authenticates requests containing a valid Bearer JWT in the Authorization header
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(
        res,
        'Access denied. No authentication token provided. Please supply a valid Bearer token in the Authorization header.',
        401
      );
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return sendError(res, 'Access denied. Malformed authorization header.', 401);
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (tokenErr) {
      if (tokenErr.name === 'TokenExpiredError') {
        return sendError(res, 'Authentication token has expired. Please log in again to renew your session.', 401);
      }
      return sendError(res, 'Invalid authentication token. Verification failed.', 401);
    }

    // Retrieve user from database to verify active status
    const user = await User.findById(decoded.id);

    if (!user) {
      return sendError(res, 'Authentication failed. The user account associated with this token no longer exists.', 401);
    }

    // Check account status
    if (user.status === 'suspended') {
      return sendError(res, 'Account suspended. Please contact the administrator.', 403);
    }

    if (user.isAccountLocked && user.isAccountLocked()) {
      const minutesRemaining = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / (60 * 1000));
      return sendError(
        res,
        `Account is temporarily locked due to consecutive failed login attempts. Please try again in ${minutesRemaining} minutes.`,
        423 // HTTP 423 Locked
      );
    }

    // Attach authenticated user document to request context
    req.user = user;
    return next();
  } catch (error) {
    console.error('🚨 [Auth Middleware Error]:', error);
    return sendError(res, 'Authentication processing failed.', 500);
  }
}

module.exports = {
  authenticate
};
