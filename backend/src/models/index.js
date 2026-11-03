/**
 * Central Model Exports
 * Module: src/models/index.js
 * 
 * Re-exports all core Mongoose models for clean, centralized access across the application.
 */

const User = require('./User');
const File = require('./File');
const Share = require('./Share');
const AuditLog = require('./AuditLog');

module.exports = {
  User,
  File,
  Share,
  AuditLog
};
