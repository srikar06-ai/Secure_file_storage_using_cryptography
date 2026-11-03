/**
 * AuditLog Mongoose Model (Database Layer - ES Modules)
 * Module: secure-file-db/src/models/AuditLog.js
 * 
 * Append-only tamper-resistant collection.
 */

import mongoose from 'mongoose';

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
          'LOGIN',
          'LOGIN_FAILED',
          'REGISTER',
          'UPLOAD',
          'DOWNLOAD',
          'SHARE',
          'REVOKE',
          'DELETE'
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
      immutable: true,
      index: -1
    }
  },
  {
    timestamps: false,
    versionKey: false
  }
);

// Block any update or deletion attempts
const rejectTamper = function (next) {
  const error = new Error('Security Violation: AuditLog records are append-only. Modification and deletion are strictly prohibited.');
  error.statusCode = 403;
  return next(error);
};

auditLogSchema.pre('updateOne', rejectTamper);
auditLogSchema.pre('updateMany', rejectTamper);
auditLogSchema.pre('findOneAndUpdate', rejectTamper);
auditLogSchema.pre('replaceOne', rejectTamper);
auditLogSchema.pre('findOneAndReplace', rejectTamper);

auditLogSchema.pre('deleteOne', rejectTamper);
auditLogSchema.pre('deleteMany', rejectTamper);
auditLogSchema.pre('findOneAndDelete', rejectTamper);
auditLogSchema.pre('deleteOne', { document: true, query: false }, rejectTamper);

auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ file: 1, createdAt: -1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
