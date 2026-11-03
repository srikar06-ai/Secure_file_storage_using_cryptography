/**
 * AuditLog Mongoose Model
 * Module: src/models/AuditLog.js
 * 
 * Provides an append-only, tamper-resistant audit trail of security events.
 * Intercepts and blocks all update and delete operations at the Mongoose middleware level.
 */

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    file: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'File',
      default: null,
      index: true
    },
    action: {
      type: String,
      required: [true, 'Audit action is required.'],
      enum: {
        values: [
          // Authentication events
          'LOGIN',
          'LOGIN_FAILED',
          'REGISTER',
          // File events
          'UPLOAD',
          'DOWNLOAD',
          'DELETE',
          'DELETE_DENIED',
          'PURGE',
          // Sharing events
          'SHARE_CREATED',
          'SHARE_DENIED',
          'SHARE_ACCESSED',
          'SHARE_REVOKED',
          // Legacy aliases (kept for backward compat)
          'SHARE',
          'REVOKE',
          // Access control
          'ACCESS_DENIED',
          'INTEGRITY_CHECK',
          // User management
          'PASSWORD_CHANGED',
          'PASSWORD_CHANGE_FAILED',
          'USER_UPDATED',
          'ACCOUNT_UNLOCKED'
        ],
        message: '{VALUE} is not a recognized audit action.'
      },
      index: true
    },
    ipAddress: {
      type: String,
      default: 'unknown',
      trim: true
    },
    userAgent: {
      type: String,
      default: 'unknown',
      trim: true
    },
    status: {
      type: String,
      enum: ['success', 'failure'],
      default: 'success',
      index: true
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true, // Cannot be modified once written
      index: -1
    }
  },
  {
    timestamps: false, // Explicitly disable updatedAt to enforce append-only nature
    versionKey: false
  }
);

// ==============================================================================
// Tamper-Resistant Middleware: Prevent Any Mutation or Deletion
// ==============================================================================

const rejectTamper = function (next) {
  const error = new Error('Security Violation: AuditLog records are append-only. Modification and deletion are strictly prohibited.');
  error.statusCode = 403;
  return next(error);
};

// Intercept Query-level update operations
auditLogSchema.pre('updateOne', rejectTamper);
auditLogSchema.pre('updateMany', rejectTamper);
auditLogSchema.pre('findOneAndUpdate', rejectTamper);
auditLogSchema.pre('replaceOne', rejectTamper);
auditLogSchema.pre('findOneAndReplace', rejectTamper);

// Intercept Query-level delete operations
auditLogSchema.pre('deleteOne', rejectTamper);
auditLogSchema.pre('deleteMany', rejectTamper);
auditLogSchema.pre('findOneAndDelete', rejectTamper);

// Intercept Document-level delete operations
auditLogSchema.pre('deleteOne', { document: true, query: false }, rejectTamper);

// Compound index for querying user activity over time
auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ file: 1, createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
