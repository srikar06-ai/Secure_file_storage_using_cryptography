/**
 * Environment Configuration and Validation
 * Module: src/config/env.js
 * 
 * Validates and exposes validated application environment variables.
 * Ensures the cryptographic master key and critical secrets are verified at boot time.
 */

const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = parseInt(process.env.PORT, 10) || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/secure_file_storage_crypto6';

// Cryptography Master Key (Key-Encryption-Key: KEK)
// Must be a 256-bit key in 64-character hexadecimal format
const MASTER_KEY = process.env.MASTER_KEY || (NODE_ENV === 'test' ? '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef' : null);

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || (NODE_ENV === 'test' ? 'test_jwt_secret_must_be_minimum_32_characters_long' : null);
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Storage Configuration
const STORAGE_PATH = process.env.STORAGE_PATH
  ? path.resolve(process.cwd(), process.env.STORAGE_PATH)
  : path.resolve(process.cwd(), 'storage/encrypted');

const MAX_FILE_SIZE_BYTES = parseInt(process.env.MAX_FILE_SIZE_BYTES, 10) || 50 * 1024 * 1024; // 50MB

// Rate Limiting Configuration
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000; // 15 mins
const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100;

/**
 * Validate required configuration at server startup
 */
function validateConfig() {
  const errors = [];

  if (!JWT_SECRET) {
    errors.push('JWT_SECRET is missing in environment variables.');
  } else if (JWT_SECRET.length < 32 && NODE_ENV === 'production') {
    errors.push('JWT_SECRET must be at least 32 characters long in production.');
  }

  if (!MASTER_KEY) {
    errors.push('MASTER_KEY is missing. A 256-bit (64 hex characters) key is required for envelope encryption.');
  } else if (!/^[0-9a-fA-F]{64}$/.test(MASTER_KEY)) {
    errors.push('MASTER_KEY must be a valid 64-character hexadecimal string (256 bits). Generate with: require("crypto").randomBytes(32).toString("hex")');
  }

  if (errors.length > 0) {
    console.error('\n❌ [Configuration Error] Missing or invalid environment variables:');
    errors.forEach(err => console.error(`  - ${err}`));
    console.error('\nPlease copy .env.example to .env and configure the required values.\n');
    if (NODE_ENV !== 'test') {
      process.exit(1);
    }
  }
}

// Run validation unless in test mode
if (NODE_ENV !== 'test') {
  validateConfig();
}

module.exports = Object.freeze({
  NODE_ENV,
  PORT,
  CLIENT_URL,
  MONGODB_URI,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  MASTER_KEY,
  STORAGE_PATH,
  MAX_FILE_SIZE_BYTES,
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_REQUESTS,
  validateConfig
});
