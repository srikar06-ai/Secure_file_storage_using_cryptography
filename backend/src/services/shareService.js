/**
 * Secure File Sharing Service
 * Module: src/services/shareService.js
 *
 * Implements cryptographically secure, time-limited, permission-scoped,
 * and revocable file sharing. Uses recipient-specific wrapped DEKs so
 * that revocation is enforced at the key level.
 *
 * Flow:
 *  1. Owner requests a share grant for a specific file and recipient (user or token-based).
 *  2. File DEK is re-wrapped specifically for the recipient.
 *  3. A Share document is created storing the re-wrapped key + SHA-256 hash of the access token.
 *  4. The raw token is returned ONCE to the owner — never stored in plaintext.
 */

const crypto = require('crypto');
const mongoose = require('mongoose');
const { File, Share, AuditLog, User } = require('../models');
const cryptoService = require('./cryptoService');

/**
 * Helper: Generate a cryptographically secure share token (URL-safe base64)
 * @param {number} [bytes=32] - Random byte count
 * @returns {{ rawToken: string, tokenHash: string }}
 */
function generateShareToken(bytes = 32) {
  const rawBytes = crypto.randomBytes(bytes);
  const rawToken = rawBytes.toString('base64url'); // URL-safe, no padding issues
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  return { rawToken, tokenHash };
}

/**
 * Create a new file share grant
 *
 * @param {object} params
 * @param {object} params.requestingUser  - Authenticated owner user document
 * @param {string} params.fileId          - MongoDB ObjectId of the file to share
 * @param {string} [params.recipientEmail]- Email of the recipient user (for user-to-user shares)
 * @param {string} [params.permission]    - 'read' | 'download' (default: 'read')
 * @param {number} [params.expiresInHours]- Expiration hours from now (null = never)
 * @param {string} [params.ipAddress]
 * @param {string} [params.userAgent]
 * @returns {Promise<{ share: object, rawToken: string|null }>}
 */
async function createShare({
  requestingUser,
  fileId,
  recipientEmail = null,
  permission = 'read',
  expiresInHours = null,
  ipAddress = 'unknown',
  userAgent = 'unknown'
}) {
  // Validate fileId format
  if (!mongoose.Types.ObjectId.isValid(fileId)) {
    const err = new Error('Invalid file identifier format.');
    err.statusCode = 400;
    throw err;
  }

  // Retrieve the file with the wrapped DEK
  const file = await File.findOne({ _id: fileId, isDeleted: false })
    .select('+crypto.wrappedKey +crypto.authTag');

  if (!file) {
    const err = new Error('File not found.');
    err.statusCode = 404;
    throw err;
  }

  // Only the owner can share
  if (file.owner.toString() !== requestingUser._id.toString()) {
    await AuditLog.create({
      user: requestingUser._id,
      file: file._id,
      action: 'SHARE_DENIED',
      ipAddress,
      userAgent,
      status: 'failure',
      details: { reason: 'Non-owner attempted to create share grant', fileId }
    });
    const err = new Error('Access denied. Only the file owner can create share grants.');
    err.statusCode = 403;
    throw err;
  }

  // Unwrap the owner's DEK from the master KEK
  const rawDEK = cryptoService.unwrapKey(file.crypto.wrappedKey);

  // Resolve recipient user (if email provided)
  let recipientUser = null;
  if (recipientEmail) {
    recipientEmail = recipientEmail.trim().toLowerCase();
    recipientUser = await User.findOne({ email: recipientEmail, status: 'active' });
    if (!recipientUser) {
      const err = new Error(`No active user found with email: ${recipientEmail}`);
      err.statusCode = 404;
      throw err;
    }

    // Prevent owner from sharing with themselves
    if (recipientUser._id.toString() === requestingUser._id.toString()) {
      const err = new Error('You cannot create a share grant with yourself.');
      err.statusCode = 400;
      throw err;
    }

    // Check if an active non-revoked share already exists for this recipient
    const existingShare = await Share.findOne({
      file: file._id,
      sharedWith: recipientUser._id,
      revokedAt: null
    });
    if (existingShare) {
      const err = new Error('An active share grant already exists for this user on this file. Revoke the existing grant first.');
      err.statusCode = 409;
      throw err;
    }
  }

  // Re-wrap DEK specifically for this share grant (not using master KEK directly)
  // This provides cryptographic isolation: revoking a share doesn't require re-encryption
  const recipientWrappedKey = cryptoService.wrapKey(rawDEK);

  // Compute expiration timestamp
  let expiresAt = null;
  if (expiresInHours && Number(expiresInHours) > 0) {
    expiresAt = new Date(Date.now() + Number(expiresInHours) * 60 * 60 * 1000);
  }

  // Generate share token (used for anonymous/link-based sharing)
  const { rawToken, tokenHash } = generateShareToken();

  // Create the Share document
  const shareDoc = await Share.create({
    file: file._id,
    owner: requestingUser._id,
    sharedWith: recipientUser ? recipientUser._id : null,
    shareTokenHash: tokenHash,
    permission,
    wrappedKey: recipientWrappedKey,
    expiresAt,
    revokedAt: null
  });

  // Audit: SHARE_CREATED
  await AuditLog.create({
    user: requestingUser._id,
    file: file._id,
    action: 'SHARE_CREATED',
    ipAddress,
    userAgent,
    status: 'success',
    details: {
      shareId: shareDoc._id,
      recipientUserId: recipientUser ? recipientUser._id : null,
      recipientEmail: recipientEmail || null,
      permission,
      expiresAt
    }
  });

  // Return the raw token (ONCE!) — never stored in plaintext
  return {
    share: {
      _id: shareDoc._id,
      file: shareDoc.file,
      permission: shareDoc.permission,
      expiresAt: shareDoc.expiresAt,
      sharedWith: recipientUser
        ? { _id: recipientUser._id, email: recipientUser.email, username: recipientUser.username }
        : null,
      createdAt: shareDoc.createdAt
    },
    rawToken // Return this ONCE to owner — never persisted in plaintext
  };
}

/**
 * Verify a share token and return the associated file metadata (for token-based access)
 *
 * @param {object} params
 * @param {string} params.rawToken - Raw share token provided by the recipient
 * @param {object} params.requestingUser - Authenticated user attempting token redemption
 * @param {string} [params.ipAddress]
 * @param {string} [params.userAgent]
 * @returns {Promise<object>} File metadata
 */
async function verifyShareToken({ rawToken, requestingUser, ipAddress = 'unknown', userAgent = 'unknown' }) {
  if (!rawToken || typeof rawToken !== 'string') {
    const err = new Error('Share token is required.');
    err.statusCode = 400;
    throw err;
  }

  const tokenHash = crypto.createHash('sha256').update(rawToken.trim()).digest('hex');

  const share = await Share.findOne({ shareTokenHash: tokenHash })
    .populate('file', 'originalName size mimeType owner createdAt isDeleted')
    .select('+shareTokenHash +wrappedKey');

  if (!share) {
    const err = new Error('Invalid or expired share token.');
    err.statusCode = 404;
    throw err;
  }

  // Validate the share grant is active
  if (share.isRevoked()) {
    const err = new Error('This share grant has been revoked by the owner.');
    err.statusCode = 403;
    throw err;
  }

  if (share.isExpired()) {
    const err = new Error('This share token has expired.');
    err.statusCode = 403;
    throw err;
  }

  if (!share.file || share.file.isDeleted) {
    const err = new Error('The shared file no longer exists.');
    err.statusCode = 404;
    throw err;
  }

  // Audit: SHARE_ACCESSED
  await AuditLog.create({
    user: requestingUser._id,
    file: share.file._id,
    action: 'SHARE_ACCESSED',
    ipAddress,
    userAgent,
    status: 'success',
    details: { shareId: share._id, permission: share.permission }
  });

  return {
    file: share.file,
    permission: share.permission,
    expiresAt: share.expiresAt,
    shareId: share._id
  };
}

/**
 * Revoke an existing share grant (owner only)
 *
 * @param {object} params
 * @param {string} params.shareId - MongoDB ObjectId of the Share document
 * @param {object} params.requestingUser - Authenticated owner user document
 * @param {string} [params.ipAddress]
 * @param {string} [params.userAgent]
 * @returns {Promise<object>} Updated share record
 */
async function revokeShare({ shareId, requestingUser, ipAddress = 'unknown', userAgent = 'unknown' }) {
  if (!mongoose.Types.ObjectId.isValid(shareId)) {
    const err = new Error('Invalid share identifier format.');
    err.statusCode = 400;
    throw err;
  }

  const share = await Share.findById(shareId);

  if (!share) {
    const err = new Error('Share grant not found.');
    err.statusCode = 404;
    throw err;
  }

  // Only the share's original owner can revoke
  if (share.owner.toString() !== requestingUser._id.toString()) {
    const err = new Error('Access denied. Only the share owner can revoke this grant.');
    err.statusCode = 403;
    throw err;
  }

  if (share.isRevoked()) {
    const err = new Error('This share grant has already been revoked.');
    err.statusCode = 409;
    throw err;
  }

  share.revokedAt = new Date();
  await share.save();

  // Audit: SHARE_REVOKED
  await AuditLog.create({
    user: requestingUser._id,
    file: share.file,
    action: 'SHARE_REVOKED',
    ipAddress,
    userAgent,
    status: 'success',
    details: { shareId: share._id, revokedAt: share.revokedAt }
  });

  return {
    _id: share._id,
    file: share.file,
    revokedAt: share.revokedAt,
    message: 'Share grant has been permanently revoked. The recipient can no longer access this file via this grant.'
  };
}

/**
 * List all active shares created by the requesting user for a specific file
 *
 * @param {object} params
 * @param {string} params.fileId - MongoDB ObjectId of the file
 * @param {object} params.requestingUser - Authenticated user
 * @returns {Promise<Array>}
 */
async function listFileShares({ fileId, requestingUser }) {
  if (!mongoose.Types.ObjectId.isValid(fileId)) {
    const err = new Error('Invalid file identifier format.');
    err.statusCode = 400;
    throw err;
  }

  // Verify file ownership
  const file = await File.findOne({ _id: fileId, isDeleted: false });
  if (!file || file.owner.toString() !== requestingUser._id.toString()) {
    const err = new Error('File not found or access denied.');
    err.statusCode = 404;
    throw err;
  }

  const shares = await Share.find({ file: fileId, owner: requestingUser._id })
    .populate('sharedWith', 'username email')
    .select('-shareTokenHash -wrappedKey')
    .sort({ createdAt: -1 });

  return shares;
}

/**
 * List all files that have been shared WITH the requesting user
 *
 * @param {object} params
 * @param {object} params.requestingUser - Authenticated user
 * @returns {Promise<Array>}
 */
async function listSharedWithMe({ requestingUser }) {
  const shares = await Share.find({
    sharedWith: requestingUser._id,
    revokedAt: null,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }]
  })
    .populate('file', 'originalName size mimeType createdAt')
    .populate('owner', 'username email')
    .select('-shareTokenHash -wrappedKey')
    .sort({ createdAt: -1 });

  return shares;
}

module.exports = {
  createShare,
  verifyShareToken,
  revokeShare,
  listFileShares,
  listSharedWithMe
};
