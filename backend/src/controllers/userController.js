/**
 * User Profile & Admin Controller
 * Module: src/controllers/userController.js
 *
 * Handles: own profile, change password, admin user list, admin user management
 */

const { User, AuditLog } = require('../models');
const { sendSuccess, sendError } = require('../utils/responseUtils');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

/**
 * Get the authenticated user's own profile
 * GET /api/users/me
 */
async function getProfile(req, res, next) {
  try {
    return sendSuccess(res, 'Profile retrieved successfully.', { user: req.user.toJSON() }, 200);
  } catch (error) {
    return next(error);
  }
}

/**
 * Change the authenticated user's own password
 * PUT /api/users/me/password
 * Body: { currentPassword, newPassword }
 */
async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    if (!currentPassword || !newPassword) {
      return sendError(res, 'Both currentPassword and newPassword are required.', 400);
    }

    if (newPassword.length < 8) {
      return sendError(res, 'New password must be at least 8 characters.', 400);
    }

    if (newPassword === currentPassword) {
      return sendError(res, 'New password must be different from your current password.', 400);
    }

    // Retrieve user with password hash
    const user = await User.findById(req.user._id).select('+passwordHash');
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isMatch) {
      // Audit: failed password change attempt
      await AuditLog.create({
        user: user._id,
        action: 'PASSWORD_CHANGE_FAILED',
        ipAddress,
        userAgent,
        status: 'failure',
        details: { reason: 'Incorrect current password provided' }
      });
      return sendError(res, 'Current password is incorrect.', 401);
    }

    // Hash and update new password
    const saltRounds = 12;
    user.passwordHash = await bcrypt.hash(newPassword, saltRounds);
    user.failedLogins = 0;
    user.lockedUntil = null;
    await user.save();

    await AuditLog.create({
      user: user._id,
      action: 'PASSWORD_CHANGED',
      ipAddress,
      userAgent,
      status: 'success',
      details: {}
    });

    return sendSuccess(res, 'Password changed successfully. Please log in again with your new password.', null, 200);
  } catch (error) {
    return next(error);
  }
}

/**
 * Admin-only: List all users with pagination and optional search
 * GET /api/users
 * Query: ?page=1&limit=20&search=email&role=user&status=active
 */
async function listUsers(req, res, next) {
  try {
    const { page = 1, limit = 20, search, role, status } = req.query;

    const clampedLimit = Math.min(Number(limit) || 20, 100);
    const skip = (Math.max(Number(page), 1) - 1) * clampedLimit;

    const filter = {};
    if (role) filter.role = role;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { email: { $regex: search.trim(), $options: 'i' } },
        { username: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-passwordHash -__v')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(clampedLimit)
        .lean(),
      User.countDocuments(filter)
    ]);

    return sendSuccess(res, `${total} user(s) found.`, {
      users,
      pagination: {
        page: Math.max(Number(page), 1),
        limit: clampedLimit,
        total,
        totalPages: Math.ceil(total / clampedLimit),
        hasNext: skip + users.length < total,
        hasPrev: skip > 0
      }
    }, 200);
  } catch (error) {
    return next(error);
  }
}

/**
 * Admin-only: Get a specific user by ID
 * GET /api/users/:userId
 */
async function getUserById(req, res, next) {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return sendError(res, 'Invalid user identifier format.', 400);
    }

    const user = await User.findById(userId).select('-passwordHash -__v');

    if (!user) {
      return sendError(res, 'User not found.', 404);
    }

    return sendSuccess(res, 'User retrieved successfully.', user, 200);
  } catch (error) {
    return next(error);
  }
}

/**
 * Admin-only: Update a user's role or status
 * PATCH /api/users/:userId
 * Body: { role?, status? }
 */
async function updateUser(req, res, next) {
  try {
    const { userId } = req.params;
    const { role, status } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return sendError(res, 'Invalid user identifier format.', 400);
    }

    // Prevent admin from modifying their own role/status via this route
    if (userId === req.user._id.toString()) {
      return sendError(res, 'Administrators cannot modify their own role or status via this endpoint.', 400);
    }

    const allowed = {};
    if (role && ['user', 'admin'].includes(role)) allowed.role = role;
    if (status && ['active', 'suspended'].includes(status)) allowed.status = status;

    if (Object.keys(allowed).length === 0) {
      return sendError(res, 'No valid fields to update. Allowed fields: role (user|admin), status (active|suspended).', 400);
    }

    const user = await User.findByIdAndUpdate(userId, { $set: allowed }, { new: true, runValidators: true })
      .select('-passwordHash -__v');

    if (!user) {
      return sendError(res, 'User not found.', 404);
    }

    await AuditLog.create({
      user: req.user._id,
      action: 'USER_UPDATED',
      ipAddress,
      userAgent,
      status: 'success',
      details: { targetUserId: userId, changes: allowed }
    });

    return sendSuccess(res, 'User updated successfully.', user, 200);
  } catch (error) {
    return next(error);
  }
}

/**
 * Admin-only: Unlock a locked user account
 * POST /api/users/:userId/unlock
 */
async function unlockUser(req, res, next) {
  try {
    const { userId } = req.params;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return sendError(res, 'Invalid user identifier format.', 400);
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { failedLoginAttempts: 0, lockedUntil: null } },
      { new: true }
    ).select('-passwordHash -__v');

    if (!user) {
      return sendError(res, 'User not found.', 404);
    }

    await AuditLog.create({
      user: req.user._id,
      action: 'ACCOUNT_UNLOCKED',
      ipAddress,
      userAgent,
      status: 'success',
      details: { targetUserId: userId, unlockedBy: req.user.email }
    });

    return sendSuccess(res, `User account for ${user.email} has been unlocked.`, user, 200);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getProfile,
  changePassword,
  listUsers,
  getUserById,
  updateUser,
  unlockUser
};
