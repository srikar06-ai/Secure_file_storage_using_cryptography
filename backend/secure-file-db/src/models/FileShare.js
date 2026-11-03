/**
 * FileShare Mongoose Model (Database Layer - ES Modules)
 * Module: secure-file-db/src/models/FileShare.js
 */

import mongoose from 'mongoose';

const fileShareSchema = new mongoose.Schema(
  {
    file: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'File',
      required: [true, 'Associated file reference is required.'],
      index: true
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'File owner reference is required.'],
      index: true
    },
    sharedWith: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient user reference is required.'],
      index: true
    },
    permission: {
      type: String,
      enum: {
        values: ['read', 'write'],
        message: '{VALUE} is not a valid sharing permission.'
      },
      default: 'read'
    },
    wrappedKey: {
      type: Buffer,
      required: [true, 'Recipient-specific wrapped Data Encryption Key is required.'],
      select: false
    },
    expiresAt: {
      type: Date,
      default: null
    },
    revokedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

fileShareSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

fileShareSchema.index(
  { file: 1, sharedWith: 1 },
  {
    unique: true,
    partialFilterExpression: { revokedAt: null }
  }
);

fileShareSchema.methods.isExpired = function () {
  return !!(this.expiresAt && this.expiresAt < new Date());
};

fileShareSchema.methods.isRevoked = function () {
  return !!this.revokedAt;
};

fileShareSchema.methods.isValid = function () {
  return !this.isRevoked() && !this.isExpired();
};

export const FileShare = mongoose.model('FileShare', fileShareSchema);
export default FileShare;
