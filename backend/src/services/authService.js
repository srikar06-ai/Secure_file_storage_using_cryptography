/**
 * Authentication Business Logic Service
 * Module: src/services/authService.js
 * 
 * Handles user registration, password hashing (bcrypt 12 rounds), login verification,
 * account lockout state tracking (5 failed attempts -> 15 min lock), JWT issuance,
 * and security audit event logging.
 */

const bcrypt = require('bcryptjs');
const { User, AuditLog } = require('../models');
const { generateToken } = require('../utils/tokenUtils');

const BCRYPT_SALT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Register a new user account
 */
async function registerUser({ username, email, password, role = 'user', ipAddress = 'unknown', userAgent = 'unknown' }) {
  // Check duplicate username
  const existingUsername = await User.findOne({ username });
  if (existingUsername) {
    const error = new Error(`Username '${username}' is already taken.`);
    error.statusCode = 409;
    throw error;
  }

  // Check duplicate email
  const existingEmail = await User.findOne({ email });
  if (existingEmail) {
    const error = new Error(`An account with email '${email}' already exists.`);
    error.statusCode = 409;
    throw error;
  }

  // Hash password using bcrypt with 12 salt rounds
  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  // Create user record
  const user = await User.create({
    username,
    email,
    passwordHash,
    role: role === 'admin' ? 'admin' : 'user'
  });

  // Record REGISTER audit log event
  await AuditLog.create({
    user: user._id,
    action: 'REGISTER',
    ipAddress,
    userAgent,
    status: 'success',
    details: {
      username: user.username,
      email: user.email,
      role: user.role
    }
  });

  // Generate initial JWT access token
  const token = generateToken({
    id: user._id,
    username: user.username,
    role: user.role
  });

  return {
    user: user.toJSON(),
    token
  };
}

/**
 * Authenticate user login credentials with account lockout protection
 */
async function loginUser({ email, password, ipAddress = 'unknown', userAgent = 'unknown' }) {
  // Find user by email, explicitly including passwordHash
  const user = await User.findOne({ email }).select('+passwordHash');

  if (!user) {
    // Record failed login attempt for unknown user
    await AuditLog.create({
      action: 'LOGIN_FAILED',
      ipAddress,
      userAgent,
      status: 'failure',
      details: {
        reason: 'User not found',
        attemptedEmail: email
      }
    });

    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  // Check if account is currently locked
  if (user.isAccountLocked()) {
    const minutesRemaining = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / (60 * 1000));

    await AuditLog.create({
      user: user._id,
      action: 'LOGIN_FAILED',
      ipAddress,
      userAgent,
      status: 'failure',
      details: {
        reason: 'Login attempt on locked account',
        minutesRemaining
      }
    });

    const error = new Error(
      `Account is temporarily locked due to excessive failed login attempts. Please try again in ${minutesRemaining} minutes.`
    );
    error.statusCode = 423; // HTTP 423 Locked
    throw error;
  }

  // Verify password against stored bcrypt hash
  const isMatch = await bcrypt.compare(password, user.passwordHash);

  if (!isMatch) {
    user.failedLogins += 1;

    let isNowLocked = false;
    if (user.failedLogins >= MAX_FAILED_ATTEMPTS) {
      user.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
      isNowLocked = true;
    }

    await user.save();

    // Record audit event
    await AuditLog.create({
      user: user._id,
      action: 'LOGIN_FAILED',
      ipAddress,
      userAgent,
      status: 'failure',
      details: {
        reason: isNowLocked ? 'Password mismatch: Account locked' : 'Password mismatch',
        failedAttempts: user.failedLogins,
        isLocked: isNowLocked
      }
    });

    if (isNowLocked) {
      const error = new Error(
        'Account has been temporarily locked for 15 minutes due to 5 consecutive failed login attempts.'
      );
      error.statusCode = 423;
      throw error;
    }

    const attemptsRemaining = MAX_FAILED_ATTEMPTS - user.failedLogins;
    const error = new Error(
      `Invalid email or password. Warning: Account will lock after ${attemptsRemaining} more failed attempt(s).`
    );
    error.statusCode = 401;
    throw error;
  }

  // Successful login: Reset failed login attempts and unlock
  if (user.failedLogins > 0 || user.lockedUntil) {
    user.failedLogins = 0;
    user.lockedUntil = null;
    await user.save();
  }

  // Record successful LOGIN audit log
  await AuditLog.create({
    user: user._id,
    action: 'LOGIN',
    ipAddress,
    userAgent,
    status: 'success',
    details: {
      username: user.username,
      email: user.email
    }
  });

  // Generate JWT access token
  const token = generateToken({
    id: user._id,
    username: user.username,
    role: user.role
  });

  return {
    user: user.toJSON(),
    token
  };
}

/**
 * Retrieve current user profile
 */
async function getCurrentUser(userId) {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }
  return user.toJSON();
}

module.exports = {
  registerUser,
  loginUser,
  getCurrentUser
};
