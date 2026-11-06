/**
 * Complete File Management REST Controller
 * Module: src/controllers/fileController.js (PHASE 3 REPLACEMENT)
 *
 * Handles: upload, download, list, getOne, delete (soft), purge (admin)
 */

const fileService = require('../services/fileService');
const { sendSuccess } = require('../utils/responseUtils');
const { getSafeContentDisposition } = require('../utils/fileUtils');

/**
 * Encrypt and upload a file
 * POST /api/files/upload
 */
async function upload(req, res, next) {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    const fileRecord = await fileService.uploadFile({
      user: req.user,
      file: req.file,
      ipAddress,
      userAgent
    });

    return sendSuccess(res, 'File encrypted and stored securely.', fileRecord, 201);
  } catch (error) {
    return next(error);
  }
}

/**
 * Download and decrypt an authorized file
 * GET /api/files/:id/download
 */
async function download(req, res, next) {
  try {
    const { id } = req.params;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    const { decryptedBuffer, originalName, mimeType, size } = await fileService.downloadFile({
      fileId: id,
      user: req.user,
      ipAddress,
      userAgent
    });

    res.setHeader('Content-Type', mimeType || 'application/octet-stream');
    res.setHeader('Content-Length', size);
    res.setHeader('Content-Disposition', getSafeContentDisposition(originalName));
    res.setHeader('X-Content-Type-Options', 'nosniff');

    return res.status(200).send(decryptedBuffer);
  } catch (error) {
    return next(error);
  }
}

/**
 * List all files owned by the authenticated user
 * GET /api/files
 * Query: ?page=1&limit=20&search=filename
 */
async function listFiles(req, res, next) {
  try {
    const { page = 1, limit = 20, search } = req.query;

    const result = await fileService.listFiles({
      user: req.user,
      page: Number(page),
      limit: Number(limit),
      search: search || null
    });

    return sendSuccess(res, 'File list retrieved successfully.', result, 200);
  } catch (error) {
    return next(error);
  }
}

/**
 * Retrieve metadata for a single file
 * GET /api/files/:id
 */
async function getFileMetadata(req, res, next) {
  try {
    const { id } = req.params;

    const file = await fileService.getFileMetadata({
      fileId: id,
      user: req.user
    });

    return sendSuccess(res, 'File metadata retrieved successfully.', file, 200);
  } catch (error) {
    return next(error);
  }
}

/**
 * Soft-delete a file
 * DELETE /api/files/:id
 */
async function deleteFile(req, res, next) {
  try {
    const { id } = req.params;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    const result = await fileService.deleteFile({
      fileId: id,
      user: req.user,
      ipAddress,
      userAgent
    });

    return sendSuccess(res, result.message, { fileId: result.fileId, deletedAt: result.deletedAt }, 200);
  } catch (error) {
    return next(error);
  }
}

/**
 * Admin-only: Permanently purge a soft-deleted file
 * DELETE /api/files/:id/purge
 */
async function purgeFile(req, res, next) {
  try {
    const { id } = req.params;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    const result = await fileService.purgeFile({
      fileId: id,
      user: req.user,
      ipAddress,
      userAgent
    });

    return sendSuccess(res, result.message, { purgedAt: result.purgedAt }, 200);
  } catch (error) {
    return next(error);
  }
}

/**
 * Restore a soft-deleted file
 * POST /api/files/:id/restore
 */
async function restoreFile(req, res, next) {
  try {
    const { id } = req.params;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    const result = await fileService.restoreFile({
      fileId: id,
      user: req.user,
      ipAddress,
      userAgent
    });

    return sendSuccess(res, result.message, result.file, 200);
  } catch (error) {
    return next(error);
  }
}

/**
 * List deleted files in trash
 * GET /api/files/trash/list
 */
async function listDeletedFiles(req, res, next) {
  try {
    const { page = 1, limit = 20 } = req.query;

    const result = await fileService.listDeletedFiles({
      user: req.user,
      page: Number(page),
      limit: Number(limit)
    });

    return sendSuccess(res, 'Deleted files retrieved.', result, 200);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  upload,
  download,
  listFiles,
  getFileMetadata,
  deleteFile,
  purgeFile,
  restoreFile,
  listDeletedFiles
};
