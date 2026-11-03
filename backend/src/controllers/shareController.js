/**
 * Secure File Sharing REST Controller
 * Module: src/controllers/shareController.js
 *
 * Handles: create share, list shares, shared-with-me, verify token, revoke
 */

const shareService = require('../services/shareService');
const { sendSuccess } = require('../utils/responseUtils');

/**
 * Create a new share grant for a file
 * POST /api/shares
 * Body: { fileId, recipientEmail?, permission?, expiresInHours? }
 */
async function createShare(req, res, next) {
  try {
    const { fileId, recipientEmail, permission, expiresInHours } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    const result = await shareService.createShare({
      requestingUser: req.user,
      fileId,
      recipientEmail: recipientEmail || null,
      permission: permission || 'read',
      expiresInHours: expiresInHours || null,
      ipAddress,
      userAgent
    });

    return sendSuccess(
      res,
      'Share grant created successfully. The rawToken is shown ONCE — save it immediately.',
      result,
      201
    );
  } catch (error) {
    return next(error);
  }
}

/**
 * List all shares created by the authenticated user for a specific file
 * GET /api/shares/file/:fileId
 */
async function listFileShares(req, res, next) {
  try {
    const { fileId } = req.params;

    const shares = await shareService.listFileShares({
      fileId,
      requestingUser: req.user
    });

    return sendSuccess(res, `${shares.length} share grant(s) found for this file.`, shares, 200);
  } catch (error) {
    return next(error);
  }
}

/**
 * List all files shared with the authenticated user
 * GET /api/shares/shared-with-me
 */
async function listSharedWithMe(req, res, next) {
  try {
    const shares = await shareService.listSharedWithMe({
      requestingUser: req.user
    });

    return sendSuccess(res, `${shares.length} file(s) have been shared with you.`, shares, 200);
  } catch (error) {
    return next(error);
  }
}

/**
 * Verify a share token and retrieve file metadata
 * POST /api/shares/verify
 * Body: { token }
 */
async function verifyToken(req, res, next) {
  try {
    const { token } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    const result = await shareService.verifyShareToken({
      rawToken: token,
      requestingUser: req.user,
      ipAddress,
      userAgent
    });

    return sendSuccess(res, 'Share token is valid. File is accessible.', result, 200);
  } catch (error) {
    return next(error);
  }
}

/**
 * Revoke an existing share grant
 * DELETE /api/shares/:shareId
 */
async function revokeShare(req, res, next) {
  try {
    const { shareId } = req.params;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    const result = await shareService.revokeShare({
      shareId,
      requestingUser: req.user,
      ipAddress,
      userAgent
    });

    return sendSuccess(res, result.message, { shareId: result._id, revokedAt: result.revokedAt }, 200);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createShare,
  listFileShares,
  listSharedWithMe,
  verifyToken,
  revokeShare
};
