/**
 * Authentication REST Controller
 * Module: src/controllers/authController.js
 * 
 * Handles incoming HTTP requests for user registration, authentication,
 * session termination, and profile retrieval.
 */

const authService = require('../services/authService');
const { sendSuccess } = require('../utils/responseUtils');

/**
 * Register a new user
 * POST /api/auth/register
 */
async function register(req, res, next) {
  try {
    const { username, email, password, role } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    const result = await authService.registerUser({
      username,
      email,
      password,
      role,
      ipAddress,
      userAgent
    });

    return sendSuccess(res, 'User registration completed successfully.', result, 201);
  } catch (error) {
    return next(error);
  }
}

/**
 * Authenticate user credentials and return JWT
 * POST /api/auth/login
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    const result = await authService.loginUser({
      email,
      password,
      ipAddress,
      userAgent
    });

    return sendSuccess(res, 'Login successful. Session established.', result, 200);
  } catch (error) {
    return next(error);
  }
}

/**
 * Logout / Terminate user session
 * POST /api/auth/logout
 */
async function logout(req, res, next) {
  try {
    // In stateless JWT architectures, the client is instructed to discard the token.
    return sendSuccess(res, 'Logout successful. Please discard your access token on the client.', null, 200);
  } catch (error) {
    return next(error);
  }
}

/**
 * Retrieve authenticated user profile
 * GET /api/auth/me
 */
async function getMe(req, res, next) {
  try {
    return sendSuccess(res, 'Authenticated user profile retrieved.', { user: req.user.toJSON() }, 200);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  register,
  login,
  logout,
  getMe
};
