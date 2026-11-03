/**
 * File System & Path Traversal Guard Utilities
 * Module: src/utils/fileUtils.js
 * 
 * Provides safe disk persistence, directory traversal prevention,
 * random storage identifier generation, and dangerous file extension filtering.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { STORAGE_PATH } = require('../config/env');

// Prohibited dangerous executable extensions
const PROHIBITED_EXTENSIONS = new Set([
  '.exe',
  '.bat',
  '.cmd',
  '.sh',
  '.bash',
  '.php',
  '.phtml',
  '.vbs',
  '.msi',
  '.dll',
  '.com',
  '.scr',
  '.hta',
  '.cpl',
  '.jar',
  '.jsp',
  '.asp',
  '.aspx'
]);

/**
 * Generates a cryptographically random storage identifier for disk storage
 * Never exposes the original filename on the host filesystem.
 * @returns {string} Example: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d.enc"
 */
function generateStorageIdentifier() {
  return `${crypto.randomUUID()}.enc`;
}

/**
 * Resolves and validates a storage file path, strictly guarding against directory traversal attacks
 * @param {string} storedIdentifier - The filename to access in the storage directory
 * @returns {string} Safe absolute file path
 * @throws {Error} If path traversal is detected
 */
function getStorageFilePath(storedIdentifier) {
  if (!storedIdentifier || typeof storedIdentifier !== 'string') {
    throw new Error('Invalid storage identifier.');
  }

  // Sanitize filename: keep only safe alphanumeric characters, dashes, and .enc extension
  const baseName = path.basename(storedIdentifier);
  if (baseName !== storedIdentifier || baseName.includes('..')) {
    throw new Error('Security Violation: Directory traversal sequence detected in storage identifier.');
  }

  const resolvedPath = path.resolve(STORAGE_PATH, baseName);
  const normalizedStoragePath = path.resolve(STORAGE_PATH);

  // Guarantee that the resolved path is strictly within the designated storage directory
  if (!resolvedPath.startsWith(normalizedStoragePath + path.sep)) {
    throw new Error('Security Violation: Path traversal attack detected.');
  }

  return resolvedPath;
}

/**
 * Checks whether an uploaded file has a prohibited executable or script extension
 * @param {string} originalName - Original user-supplied filename
 * @returns {boolean} True if allowed, false if prohibited
 */
function isAllowedFileExtension(originalName) {
  if (!originalName || typeof originalName !== 'string') {
    return false;
  }

  const ext = path.extname(originalName).toLowerCase();
  return !PROHIBITED_EXTENSIONS.has(ext);
}

/**
 * Safely writes an encrypted buffer to disk
 * @param {string} storedIdentifier - Storage filename
 * @param {Buffer} encryptedBuffer - Encrypted ciphertext buffer
 * @returns {Promise<string>} Resolved file path
 */
async function writeEncryptedFile(storedIdentifier, encryptedBuffer) {
  const filePath = getStorageFilePath(storedIdentifier);
  await fs.promises.writeFile(filePath, encryptedBuffer);
  return filePath;
}

/**
 * Safely deletes an encrypted file from disk (e.g. on rollback or permanent deletion)
 * @param {string} storedIdentifier - Storage filename
 */
async function deleteStoredFile(storedIdentifier) {
  try {
    const filePath = getStorageFilePath(storedIdentifier);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  } catch (err) {
    console.error(`⚠️ [Storage Warning] Failed to delete file ${storedIdentifier}:`, err.message);
  }
}

/**
 * Reads an encrypted file from disk
 * @param {string} storedIdentifier - Storage filename
 * @returns {Promise<Buffer>} Ciphertext buffer
 */
async function readEncryptedFile(storedIdentifier) {
  const filePath = getStorageFilePath(storedIdentifier);
  return await fs.promises.readFile(filePath);
}

/**
 * Formats a secure RFC 6266 Content-Disposition header to safely handle special characters
 * and prevent HTTP response header injection attacks
 * @param {string} filename - Original user-supplied filename
 * @returns {string} Sanitized Content-Disposition value
 */
function getSafeContentDisposition(filename) {
  // Strip control characters, newlines, carriage returns
  const sanitized = (filename || 'download.bin').replace(/[\r\n\0]/g, '').replace(/"/g, '\\"');
  const encoded = encodeURIComponent(filename || 'download.bin');
  return `attachment; filename="${sanitized}"; filename*=UTF-8''${encoded}`;
}

module.exports = {
  generateStorageIdentifier,
  getStorageFilePath,
  isAllowedFileExtension,
  writeEncryptedFile,
  deleteStoredFile,
  readEncryptedFile,
  getSafeContentDisposition
};
