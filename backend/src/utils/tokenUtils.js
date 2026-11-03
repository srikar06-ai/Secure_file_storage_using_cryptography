/**
 * JWT & Security Token Utilities
 * Module: src/utils/tokenUtils.js
 * 
 * Provides cryptographically secure signing and verification of JSON Web Tokens (JWT)
 * and high-entropy random token generation.
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/env');

/**
 * Signs a new JSON Web Token with claims
 * @param {object} payload - Claims to include in the token payload (e.g. id, username, role)
 * @param {string} [expiresIn] - Optional custom expiration duration
 * @returns {string} Signed JWT string
 */
function generateToken(payload, expiresIn = JWT_EXPIRES_IN) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured.');
  }

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn,
    algorithm: 'HS256'
  });
}

/**
 * Verifies and decodes a JSON Web Token
 * @param {string} token - JWT token string
 * @returns {object} Decoded token payload
 * @throws {jwt.JsonWebTokenError|jwt.TokenExpiredError}
 */
function verifyToken(token) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured.');
  }

  return jwt.verify(token, JWT_SECRET, {
    algorithms: ['HS256']
  });
}

/**
 * Generates a cryptographically secure random hexadecimal token
 * @param {number} [byteLength=32] - Number of random bytes (32 bytes = 64 hex chars)
 * @returns {string} Hexadecimal string
 */
function generateSecureRandomToken(byteLength = 32) {
  return crypto.randomBytes(byteLength).toString('hex');
}

/**
 * Generates a SHA-256 hash of a string/token
 * @param {string} input - Raw token or string
 * @returns {string} 64-char SHA-256 hexadecimal hash
 */
function hashStringSHA256(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

module.exports = {
  generateToken,
  verifyToken,
  generateSecureRandomToken,
  hashStringSHA256
};
