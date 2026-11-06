/**
 * Complete File Management Service - Extended Operations
 * Module: src/services/fileService.js (PHASE 3 REPLACEMENT)
 *
 * Adds: listing, metadata retrieval, soft-delete, admin purge
 * Maintains: upload + download from Phase 2
 */

const cryptoService = require('./cryptoService');
const mongoose = require('mongoose');
const { File, Share, AuditLog } = require('../models');
const {
  generateStorageIdentifier,
  writeEncryptedFile,
  deleteStoredFile,
  readEncryptedFile
} = require('../utils/fileUtils');

/**
 * Encrypts an uploaded file buffer and persists ciphertext to disk and metadata to MongoDB
 */
async function uploadFile({ user, file, ipAddress = 'unknown', userAgent = 'unknown' }) {
  if (!file || !file.buffer) {
    const error = new Error('No file buffer provided for encryption.');
    error.statusCode = 400;
    throw error;
  }

  const { encryptedBuffer, sha256, iv, authTag, wrappedKey } = cryptoService.encryptFileWithEnvelope(file.buffer);
  const storedIdentifier = generateStorageIdentifier();
  let isFileWrittenToDisk = false;

  try {
    await writeEncryptedFile(storedIdentifier, encryptedBuffer);
    isFileWrittenToDisk = true;

    const fileRecord = await File.create({
      owner: user._id,
      originalName: file.originalname,
      storedIdentifier,
      size: file.size,
      mimeType: file.mimetype || 'application/octet-stream',
      sha256,
      crypto: {
        algorithm: 'AES-256-GCM',
        version: '1.0',
        iv,
        authTag,
        wrappedKey
      }
    });

    await AuditLog.create({
      user: user._id,
      file: fileRecord._id,
      action: 'UPLOAD',
      ipAddress,
      userAgent,
      status: 'success',
      details: {
        originalName: file.originalname,
        storedIdentifier,
        sizeBytes: file.size,
        mimeType: file.mimetype,
        sha256,
        encryptionAlgorithm: 'AES-256-GCM'
      }
    });

    const sanitizedFile = fileRecord.toObject();
    if (sanitizedFile.crypto) {
      delete sanitizedFile.crypto.authTag;
      delete sanitizedFile.crypto.wrappedKey;
    }

    return sanitizedFile;
  } catch (error) {
    if (isFileWrittenToDisk) {
      console.warn(`🧹 [Rollback] Cleaning up orphaned encrypted file: ${storedIdentifier}`);
      await deleteStoredFile(storedIdentifier);
    }
    throw error;
  }
}

/**
 * Authenticates access, retrieves encrypted ciphertext, unwraps DEK,
 * decrypts with AES-256-GCM, verifies SHA-256, and logs security audit trail.
 */
async function downloadFile({ fileId, user, ipAddress = 'unknown', userAgent = 'unknown' }) {
  if (!mongoose.Types.ObjectId.isValid(fileId)) {
    const error = new Error('Invalid file identifier format.');
    error.statusCode = 400;
    throw error;
  }

  const file = await File.findOne({ _id: fileId, isDeleted: false })
    .select('+crypto.wrappedKey +crypto.authTag');

  if (!file) {
    const error = new Error('File not found or access denied.');
    error.statusCode = 404;
    throw error;
  }

  const isOwner = file.owner.toString() === user._id.toString();
  let validShare = null;

  if (!isOwner) {
    validShare = await Share.findOne({
      file: file._id,
      sharedWith: user._id,
      revokedAt: null,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }]
    }).select('+wrappedKey');
  }

  if (!isOwner && !validShare) {
    await AuditLog.create({
      user: user._id,
      file: file._id,
      action: 'ACCESS_DENIED',
      ipAddress,
      userAgent,
      status: 'failure',
      details: { reason: 'Unauthorized download attempt on private file', fileId: file._id }
    });

    const error = new Error('File not found or access denied.');
    error.statusCode = 404;
    throw error;
  }

  const keyToUnwrap = isOwner ? file.crypto.wrappedKey : validShare.wrappedKey;
  const encryptedBuffer = await readEncryptedFile(file.storedIdentifier);

  const decryptedBuffer = cryptoService.decryptFileWithEnvelope(
    encryptedBuffer,
    keyToUnwrap,
    file.crypto.iv,
    file.crypto.authTag,
    file.sha256
  );

  await AuditLog.create({
    user: user._id,
    file: file._id,
    action: 'DOWNLOAD',
    ipAddress,
    userAgent,
    status: 'success',
    details: {
      originalName: file.originalName,
      sizeBytes: file.size,
      mimeType: file.mimeType,
      isSharedAccess: !isOwner
    }
  });

  return {
    decryptedBuffer,
    originalName: file.originalName,
    mimeType: file.mimeType,
    size: file.size
  };
}

/**
 * List all files owned by the requesting user (paginated)
 *
 * @param {object} params
 * @param {object} params.user   - Authenticated user
 * @param {number} [params.page=1]
 * @param {number} [params.limit=20]
 * @param {string} [params.search] - Optional search by originalName
 * @returns {Promise<{ files: Array, pagination: object }>}
 */
async function listFiles({ user, page = 1, limit = 20, search = null }) {
  const clampedLimit = Math.min(Number(limit) || 20, 100);
  const skip = (Math.max(Number(page), 1) - 1) * clampedLimit;

  const filter = { owner: user._id, isDeleted: false };

  if (search && typeof search === 'string' && search.trim()) {
    // Case-insensitive filename search
    filter.originalName = { $regex: search.trim(), $options: 'i' };
  }

  const [files, total] = await Promise.all([
    File.find(filter)
      .select('-crypto') // Never expose crypto metadata in list view
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(clampedLimit)
      .lean(),
    File.countDocuments(filter)
  ]);

  return {
    files,
    pagination: {
      page: Math.max(Number(page), 1),
      limit: clampedLimit,
      total,
      totalPages: Math.ceil(total / clampedLimit),
      hasNext: skip + files.length < total,
      hasPrev: skip > 0
    }
  };
}

/**
 * Retrieve metadata for a single file (owner or authorized share recipient)
 *
 * @param {object} params
 * @param {string} params.fileId - MongoDB ObjectId
 * @param {object} params.user   - Authenticated user
 * @returns {Promise<object>} File metadata (no crypto secrets)
 */
async function getFileMetadata({ fileId, user }) {
  if (!mongoose.Types.ObjectId.isValid(fileId)) {
    const error = new Error('Invalid file identifier format.');
    error.statusCode = 400;
    throw error;
  }

  const file = await File.findOne({ _id: fileId, isDeleted: false })
    .select('-crypto.wrappedKey -crypto.authTag')
    .populate('owner', 'username email');

  if (!file) {
    const error = new Error('File not found or access denied.');
    error.statusCode = 404;
    throw error;
  }

  const isOwner = file.owner._id.toString() === user._id.toString();

  if (!isOwner) {
    // Check for valid share grant
    const validShare = await Share.findOne({
      file: file._id,
      sharedWith: user._id,
      revokedAt: null,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }]
    });

    if (!validShare) {
      const error = new Error('File not found or access denied.');
      error.statusCode = 404;
      throw error;
    }
  }

  // Sanitize crypto block for metadata response
  const fileObj = file.toObject();
  if (fileObj.crypto) {
    // Show only safe, non-secret fields
    fileObj.crypto = {
      algorithm: fileObj.crypto.algorithm,
      version: fileObj.crypto.version
    };
  }

  return fileObj;
}

/**
 * Soft-delete a file (owner only or admin)
 *
 * Marks as deleted in MongoDB; physical ciphertext remains on disk until
 * a separate purge operation (admin-only) removes it for compliance.
 *
 * @param {object} params
 * @param {string} params.fileId - MongoDB ObjectId
 * @param {object} params.user   - Authenticated user
 * @param {string} [params.ipAddress]
 * @param {string} [params.userAgent]
 * @returns {Promise<object>}
 */
async function deleteFile({ fileId, user, ipAddress = 'unknown', userAgent = 'unknown' }) {
  if (!mongoose.Types.ObjectId.isValid(fileId)) {
    const error = new Error('Invalid file identifier format.');
    error.statusCode = 400;
    throw error;
  }

  const file = await File.findOne({ _id: fileId, isDeleted: false });

  if (!file) {
    const error = new Error('File not found or already deleted.');
    error.statusCode = 404;
    throw error;
  }

  const isOwner = file.owner.toString() === user._id.toString();
  const isAdmin = user.role === 'admin';

  if (!isOwner && !isAdmin) {
    await AuditLog.create({
      user: user._id,
      file: file._id,
      action: 'DELETE_DENIED',
      ipAddress,
      userAgent,
      status: 'failure',
      details: { reason: 'Non-owner attempted to delete file', fileId: file._id }
    });

    const error = new Error('Access denied. Only the file owner can delete this file.');
    error.statusCode = 403;
    throw error;
  }

  // Soft-delete
  await file.softDelete();

  // Revoke ALL active share grants when a file is deleted
  await Share.updateMany(
    { file: file._id, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );

  await AuditLog.create({
    user: user._id,
    file: file._id,
    action: 'DELETE',
    ipAddress,
    userAgent,
    status: 'success',
    details: {
      originalName: file.originalName,
      storedIdentifier: file.storedIdentifier,
      deletedBy: isAdmin && !isOwner ? 'admin' : 'owner'
    }
  });

  return {
    message: `File "${file.originalName}" has been soft-deleted. All active shares have been revoked.`,
    fileId: file._id,
    deletedAt: file.deletedAt
  };
}

/**
 * Admin-only: Permanently purge a soft-deleted file from disk and database
 *
 * @param {object} params
 * @param {string} params.fileId - MongoDB ObjectId
 * @param {object} params.user   - Must be admin
 * @param {string} [params.ipAddress]
 * @param {string} [params.userAgent]
 */
async function purgeFile({ fileId, user, ipAddress = 'unknown', userAgent = 'unknown' }) {
  if (user.role !== 'admin') {
    const err = new Error('Access denied. Administrator privileges required for purge.');
    err.statusCode = 403;
    throw err;
  }

  if (!mongoose.Types.ObjectId.isValid(fileId)) {
    const err = new Error('Invalid file identifier format.');
    err.statusCode = 400;
    throw err;
  }

  const file = await File.findOne({ _id: fileId, isDeleted: true });

  if (!file) {
    const err = new Error('File not found or not in deleted state. Purge only works on soft-deleted files.');
    err.statusCode = 404;
    throw err;
  }

  // Delete physical ciphertext from disk
  await deleteStoredFile(file.storedIdentifier);

  // Hard-delete MongoDB document and all related shares + audit logs cleanup
  await File.deleteOne({ _id: file._id });

  await AuditLog.create({
    user: user._id,
    file: file._id,
    action: 'PURGE',
    ipAddress,
    userAgent,
    status: 'success',
    details: {
      originalName: file.originalName,
      storedIdentifier: file.storedIdentifier,
      sizeBytes: file.size
    }
  });

  return {
    message: `File "${file.originalName}" has been permanently purged from disk and database.`,
    purgedAt: new Date()
  };
}

/**
 * Restore a soft-deleted file
 *
 * @param {object} params
 * @param {string} params.fileId - MongoDB ObjectId
 * @param {object} params.user   - Authenticated user
 * @param {string} [params.ipAddress]
 * @param {string} [params.userAgent]
 * @returns {Promise<object>}
 */
async function restoreFile({ fileId, user, ipAddress = 'unknown', userAgent = 'unknown' }) {
  if (!mongoose.Types.ObjectId.isValid(fileId)) {
    const error = new Error('Invalid file identifier format.');
    error.statusCode = 400;
    throw error;
  }

  const file = await File.findOne({ _id: fileId, isDeleted: true });

  if (!file) {
    const error = new Error('File not found in trash or already active.');
    error.statusCode = 404;
    throw error;
  }

  const isOwner = file.owner.toString() === user._id.toString();
  const isAdmin = user.role === 'admin';

  if (!isOwner && !isAdmin) {
    const error = new Error('Access denied. Only the file owner can restore this file.');
    error.statusCode = 403;
    throw error;
  }

  file.isDeleted = false;
  file.deletedAt = null;
  await file.save();

  await AuditLog.create({
    user: user._id,
    file: file._id,
    action: 'RESTORE',
    ipAddress,
    userAgent,
    status: 'success',
    details: {
      originalName: file.originalName,
      storedIdentifier: file.storedIdentifier,
      restoredBy: isAdmin && !isOwner ? 'admin' : 'owner'
    }
  });

  return {
    message: `File "${file.originalName}" has been successfully restored.`,
    file: file.toObject()
  };
}

/**
 * List all soft-deleted files for user
 */
async function listDeletedFiles({ user, page = 1, limit = 20 }) {
  const clampedLimit = Math.min(Number(limit) || 20, 100);
  const skip = (Math.max(Number(page), 1) - 1) * clampedLimit;

  const filter = { owner: user._id, isDeleted: true };

  const [files, total] = await Promise.all([
    File.find(filter)
      .select('-crypto')
      .sort({ deletedAt: -1 })
      .skip(skip)
      .limit(clampedLimit)
      .lean(),
    File.countDocuments(filter)
  ]);

  return {
    files,
    pagination: {
      page: Math.max(Number(page), 1),
      limit: clampedLimit,
      total,
      totalPages: Math.ceil(total / clampedLimit),
      hasNext: skip + files.length < total,
      hasPrev: skip > 0
    }
  };
}

module.exports = {
  uploadFile,
  downloadFile,
  listFiles,
  getFileMetadata,
  deleteFile,
  purgeFile,
  restoreFile,
  listDeletedFiles
};
