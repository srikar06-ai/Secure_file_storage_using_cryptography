/**
 * File Mongoose Model (Database Layer - ES Modules)
 * Module: secure-file-db/src/models/File.js
 */

import mongoose from 'mongoose';

const cryptoSubdocumentSchema = new mongoose.Schema(
  {
    algorithm: {
      type: String,
      default: 'AES-256-GCM',
      enum: ['AES-256-GCM']
    },
    version: {
      type: String,
      default: '1.0'
    },
    iv: {
      type: Buffer,
      required: [true, 'Initialization vector (IV/nonce) is required.'],
      validate: {
        validator: (buf) => Buffer.isBuffer(buf) && buf.length === 12,
        message: 'AES-256-GCM nonce/IV must be exactly 12 bytes (96 bits).'
      }
    },
    authTag: {
      type: Buffer,
      required: [true, 'Authentication tag is required for GCM mode.'],
      select: false,
      validate: {
        validator: (buf) => Buffer.isBuffer(buf) && buf.length === 16,
        message: 'AES-256-GCM authentication tag must be exactly 16 bytes (128 bits).'
      }
    },
    wrappedKey: {
      type: Buffer,
      required: [true, 'Wrapped Data Encryption Key (DEK) is required.'],
      select: false
    }
  },
  { _id: false }
);

const fileSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'File must have an associated owner.'],
      index: true
    },
    originalName: {
      type: String,
      required: [true, 'Original filename is required.'],
      trim: true,
      maxlength: [255, 'Filename cannot exceed 255 characters.']
    },
    storagePath: {
      type: String,
      required: [true, 'Storage path is required.'],
      trim: true
    },
    size: {
      type: Number,
      required: [true, 'File size in bytes is required.'],
      min: [1, 'File size must be a positive integer greater than zero.']
    },
    mimeType: {
      type: String,
      required: [true, 'MIME type is required.'],
      trim: true,
      default: 'application/octet-stream'
    },
    sha256: {
      type: String,
      required: [true, 'SHA-256 integrity hash is required.'],
      trim: true,
      lowercase: true,
      match: [/^[a-f0-9]{64}$/, 'SHA-256 checksum must be a 64-character lowercase hexadecimal string.'],
      index: true
    },
    crypto: {
      type: cryptoSubdocumentSchema,
      required: true
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },
    deletedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

fileSchema.index({ owner: 1, isDeleted: 1, createdAt: -1 });

export const File = mongoose.model('File', fileSchema);
export default File;
