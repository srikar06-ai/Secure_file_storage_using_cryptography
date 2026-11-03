/**
 * Share / FileShare Mongoose Model
 * Module: src/models/Share.js
 * 
 * Manages fine-grained, time-limited, and revocable file sharing.
 * Stores recipient-specific wrapped DEKs and hashed sharing tokens.
 */

const mongoose = require('mongoose');

const shareSchema = new mongoose.Schema(
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
      default: null,
      index: true
    },
    shareTokenHash: {
      type: String,
      default: null,
      select: false, // Hidden by default, matched against hash of provided token
      index: true
    },
    permission: {
      type: String,
      enum: {
        values: ['read', 'download', 'write'],
        message: '{VALUE} is not a valid sharing permission.'
      },
      default: 'read'
    },
    wrappedKey: {
      type: Buffer,
      required: [true, 'Recipient-specific wrapped Data Encryption Key is required.'],
      select: false // Only retrieved during authorized decryption
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

// TTL Index: MongoDB automatically purges expired records in the background
// Note: As MongoDB TTL worker runs every 60s, application code must still check expiresAt explicitly!
shareSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound unique index: prevents duplicate active shares for the same file and recipient
shareSchema.index(
  { file: 1, sharedWith: 1 },
  {
    unique: true,
    partialFilterExpression: { sharedWith: { $type: 'objectId' }, revokedAt: null }
  }
);

/**
 * Checks if the share has expired
 * @returns {boolean}
 */
shareSchema.methods.isExpired = function () {
  return !!(this.expiresAt && this.expiresAt < new Date());
};

/**
 * Checks if the share has been revoked
 * @returns {boolean}
 */
shareSchema.methods.isRevoked = function () {
  return !!this.revokedAt;
};

/**
 * Checks if the share grant is actively valid
 * @returns {boolean}
 */
shareSchema.methods.isValid = function () {
  return !this.isRevoked() && !this.isExpired();
};

const Share = mongoose.model('Share', shareSchema);

module.exports = Share;
