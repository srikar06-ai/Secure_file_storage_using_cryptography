/**
 * Multer File Ingestion & Security Filter Middleware
 * Module: src/middleware/uploadMiddleware.js
 * 
 * Streams incoming uploads directly into RAM memory buffers.
 * Never allows unencrypted files to touch the host filesystem in plaintext.
 * Enforces file size ceilings and restricts prohibited executable extensions.
 */

const multer = require('multer');
const { MAX_FILE_SIZE_BYTES } = require('../config/env');
const { isAllowedFileExtension } = require('../utils/fileUtils');
const { sendError } = require('../utils/responseUtils');

// Configure Multer in-memory storage buffer
const storage = multer.memoryStorage();

// File security filter
const fileFilter = (req, file, cb) => {
  if (!isAllowedFileExtension(file.originalname)) {
    const error = new Error('File upload rejected: Executable files and dangerous script extensions are strictly prohibited for security reasons.');
    error.statusCode = 400;
    return cb(error, false);
  }
  return cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 1 // Single file upload per request
  },
  fileFilter
});

/**
 * Express middleware for single file upload on field 'file'
 */
function uploadSingle(req, res, next) {
  const uploadHandler = upload.single('file');

  uploadHandler(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          const maxMB = Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024));
          return sendError(res, `File size exceeds the maximum allowed limit of ${maxMB}MB.`, 400);
        }
        return sendError(res, `File upload failed: ${err.message}`, 400);
      }
      return sendError(res, err.message, err.statusCode || 400);
    }

    if (!req.file) {
      return sendError(res, "No file uploaded. Please supply a file in the 'file' form-data field.", 400);
    }

    return next();
  });
}

module.exports = {
  uploadSingle
};
