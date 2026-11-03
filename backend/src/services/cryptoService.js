/**
 * Cryptography Service (AES-256-GCM & Envelope Encryption Engine)
 * Module: src/services/cryptoService.js
 * 
 * Implements:
 * 1. AES-256-GCM authenticated encryption for file buffers.
 * 2. Envelope Encryption (unique per-file DEK protected by master KEK).
 * 3. Cryptographically random 96-bit (12-byte) nonce generation per operation.
 * 4. Authentication tag enforcement (128-bit / 16-byte authTag) to reject tampering.
 * 5. SHA-256 integrity verification.
 * 6. Cloud KMS migration readiness abstraction.
 */

const crypto = require('crypto');
const { MASTER_KEY } = require('../config/env');

// Cryptographic constants
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH_BYTES = 32; // 256 bits
const GCM_IV_LENGTH_BYTES = 12; // 96 bits (NIST recommendation for GCM)
const GCM_AUTH_TAG_LENGTH_BYTES = 16; // 128 bits
const WRAPPED_KEY_IV_LENGTH = 12;
const WRAPPED_KEY_TAG_LENGTH = 16;

/**
 * Parses and returns the master Key-Encryption-Key (KEK) Buffer from environment
 * @returns {Buffer} 32-byte Master Key Buffer
 */
function getMasterKey() {
  if (!MASTER_KEY) {
    throw new Error('Cryptographic configuration error: MASTER_KEY is not defined in environment.');
  }

  const keyBuffer = Buffer.from(MASTER_KEY, 'hex');
  if (keyBuffer.length !== KEY_LENGTH_BYTES) {
    throw new Error(`Cryptographic configuration error: MASTER_KEY must be a 256-bit key (${KEY_LENGTH_BYTES} bytes, 64 hex characters). Received ${keyBuffer.length} bytes.`);
  }

  return keyBuffer;
}

/**
 * Computes a SHA-256 integrity checksum for a buffer
 * @param {Buffer} buffer - Plaintext file buffer
 * @returns {string} 64-character lowercase hex string
 */
function calculateSHA256(buffer) {
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError('calculateSHA256 requires a Buffer input.');
  }
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Generates a cryptographically secure random 256-bit Data Encryption Key (DEK)
 * @returns {Buffer} 32-byte DEK
 */
function generateDEK() {
  return crypto.randomBytes(KEY_LENGTH_BYTES);
}

/**
 * Generates a unique 96-bit nonce / initialization vector for AES-GCM
 * @returns {Buffer} 12-byte IV
 */
function generateIV() {
  return crypto.randomBytes(GCM_IV_LENGTH_BYTES);
}

/**
 * Wraps (encrypts) a per-file Data Encryption Key (DEK) using the Master Key (KEK)
 * Implements authenticated envelope encryption for the DEK.
 * Format: [12 bytes IV] + [16 bytes AuthTag] + [32 bytes Encrypted DEK] = 60 bytes total
 * 
 * Note for Cloud KMS Migration:
 * In AWS KMS, this function would call `kms.encrypt({ KeyId: 'alias/crypto6-master', Plaintext: dekBuffer })`.
 * In Google Cloud KMS, it calls `keyManagementServiceClient.encrypt({ name: keyName, plaintext: dekBuffer })`.
 * 
 * @param {Buffer} dekBuffer - The 32-byte plaintext DEK
 * @param {Buffer} [kekBuffer] - Optional Master Key override
 * @returns {Buffer} 60-byte wrapped key binary buffer
 */
function wrapKey(dekBuffer, kekBuffer = getMasterKey()) {
  if (!Buffer.isBuffer(dekBuffer) || dekBuffer.length !== KEY_LENGTH_BYTES) {
    throw new Error(`Invalid DEK: Expected a ${KEY_LENGTH_BYTES}-byte Buffer.`);
  }

  const iv = generateIV();
  const cipher = crypto.createCipheriv(ALGORITHM, kekBuffer, iv);
  const encryptedDEK = Buffer.concat([cipher.update(dekBuffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Pack binary: IV (12) + AuthTag (16) + Ciphertext (32)
  return Buffer.concat([iv, authTag, encryptedDEK]);
}

/**
 * Unwraps (decrypts) a wrapped Data Encryption Key using the Master Key (KEK)
 * 
 * @param {Buffer} wrappedKeyBuffer - 60-byte wrapped key buffer
 * @param {Buffer} [kekBuffer] - Optional Master Key override
 * @returns {Buffer} 32-byte plaintext DEK Buffer
 */
function unwrapKey(wrappedKeyBuffer, kekBuffer = getMasterKey()) {
  if (!Buffer.isBuffer(wrappedKeyBuffer)) {
    throw new TypeError('unwrapKey requires a Buffer input.');
  }

  const expectedLength = WRAPPED_KEY_IV_LENGTH + WRAPPED_KEY_TAG_LENGTH + KEY_LENGTH_BYTES;
  if (wrappedKeyBuffer.length !== expectedLength) {
    throw new Error(`Invalid wrapped key format: Expected ${expectedLength} bytes, received ${wrappedKeyBuffer.length} bytes.`);
  }

  // Unpack components
  const iv = wrappedKeyBuffer.subarray(0, WRAPPED_KEY_IV_LENGTH);
  const authTag = wrappedKeyBuffer.subarray(WRAPPED_KEY_IV_LENGTH, WRAPPED_KEY_IV_LENGTH + WRAPPED_KEY_TAG_LENGTH);
  const encryptedDEK = wrappedKeyBuffer.subarray(WRAPPED_KEY_IV_LENGTH + WRAPPED_KEY_TAG_LENGTH);

  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, kekBuffer, iv);
    decipher.setAuthTag(authTag);
    const dek = Buffer.concat([decipher.update(encryptedDEK), decipher.final()]);
    return dek;
  } catch (err) {
    throw new Error('Key unwrapping failed: Master key mismatch or wrapped key has been tampered with.');
  }
}

/**
 * Encrypts a plaintext file buffer using AES-256-GCM with a specified DEK
 * 
 * @param {Buffer} fileBuffer - Plaintext file data
 * @param {Buffer} dek - 32-byte Data Encryption Key
 * @returns {{ encryptedBuffer: Buffer, iv: Buffer, authTag: Buffer }}
 */
function encryptFile(fileBuffer, dek) {
  if (!Buffer.isBuffer(fileBuffer)) {
    throw new TypeError('encryptFile requires a Buffer input for fileBuffer.');
  }
  if (!Buffer.isBuffer(dek) || dek.length !== KEY_LENGTH_BYTES) {
    throw new Error(`encryptFile requires a ${KEY_LENGTH_BYTES}-byte Buffer for DEK.`);
  }

  // Generate unique 96-bit nonce
  const iv = generateIV();

  // Initialize AES-256-GCM cipher
  const cipher = crypto.createCipheriv(ALGORITHM, dek, iv);

  // Encrypt file buffer
  const encryptedBuffer = Buffer.concat([cipher.update(fileBuffer), cipher.final()]);

  // Retrieve 128-bit authentication tag
  const authTag = cipher.getAuthTag();

  return {
    encryptedBuffer,
    iv,
    authTag
  };
}

/**
 * Decrypts an encrypted file buffer using AES-256-GCM
 * Enforces authentication tag verification to reject any modified ciphertext.
 * 
 * @param {Buffer} encryptedBuffer - Ciphertext buffer
 * @param {Buffer} dek - 32-byte Data Encryption Key
 * @param {Buffer} iv - 12-byte initialization vector / nonce
 * @param {Buffer} authTag - 16-byte authentication tag
 * @returns {Buffer} Original plaintext file buffer
 */
function decryptFile(encryptedBuffer, dek, iv, authTag) {
  if (!Buffer.isBuffer(encryptedBuffer)) {
    throw new TypeError('decryptFile requires a Buffer input for encryptedBuffer.');
  }
  if (!Buffer.isBuffer(dek) || dek.length !== KEY_LENGTH_BYTES) {
    throw new Error(`decryptFile requires a ${KEY_LENGTH_BYTES}-byte Buffer for DEK.`);
  }
  if (!Buffer.isBuffer(iv) || iv.length !== GCM_IV_LENGTH_BYTES) {
    throw new Error(`Invalid IV length: Expected ${GCM_IV_LENGTH_BYTES} bytes, received ${iv ? iv.length : 'null'}.`);
  }
  if (!Buffer.isBuffer(authTag) || authTag.length !== GCM_AUTH_TAG_LENGTH_BYTES) {
    throw new Error(`Invalid AuthTag length: Expected ${GCM_AUTH_TAG_LENGTH_BYTES} bytes, received ${authTag ? authTag.length : 'null'}.`);
  }

  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, dek, iv);
    decipher.setAuthTag(authTag);
    const decryptedBuffer = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
    return decryptedBuffer;
  } catch (err) {
    // OpenSSL throws when authTag verification fails or ciphertext is modified
    const error = new Error('Cryptographic integrity check failed: Ciphertext, IV, or authentication tag has been tampered with or corrupted.');
    error.code = 'ERR_CRYPTO_INTEGRITY_FAILED';
    throw error;
  }
}

/**
 * End-to-end Envelope Encryption Pipeline:
 * Calculates SHA-256, generates unique DEK, encrypts file, and wraps DEK.
 * 
 * @param {Buffer} fileBuffer - Plaintext file data
 * @returns {{ encryptedBuffer: Buffer, sha256: string, iv: Buffer, authTag: Buffer, wrappedKey: Buffer }}
 */
function encryptFileWithEnvelope(fileBuffer) {
  // 1. Calculate integrity hash of original plaintext file
  const sha256 = calculateSHA256(fileBuffer);

  // 2. Generate unique per-file DEK
  const dek = generateDEK();

  try {
    // 3. Encrypt file using AES-256-GCM
    const { encryptedBuffer, iv, authTag } = encryptFile(fileBuffer, dek);

    // 4. Wrap DEK using Master Key (KEK)
    const wrappedKey = wrapKey(dek);

    return {
      encryptedBuffer,
      sha256,
      iv,
      authTag,
      wrappedKey
    };
  } finally {
    // Security best practice: Zero out plaintext DEK buffer in memory
    dek.fill(0);
  }
}

/**
 * End-to-end Envelope Decryption Pipeline:
 * Unwraps DEK using Master Key, decrypts file buffer, and verifies SHA-256 integrity.
 * 
 * @param {Buffer} encryptedBuffer - Ciphertext file data
 * @param {Buffer} wrappedKey - 60-byte wrapped DEK
 * @param {Buffer} iv - 12-byte IV
 * @param {Buffer} authTag - 16-byte authTag
 * @param {string} [expectedSha256] - Optional SHA-256 checksum for end-to-end integrity check
 * @returns {Buffer} Original plaintext file buffer
 */
function decryptFileWithEnvelope(encryptedBuffer, wrappedKey, iv, authTag, expectedSha256 = null) {
  // 1. Unwrap DEK using Master Key
  const dek = unwrapKey(wrappedKey);

  let decryptedBuffer;
  try {
    // 2. Decrypt ciphertext and verify AES-GCM authentication tag
    decryptedBuffer = decryptFile(encryptedBuffer, dek, iv, authTag);
  } finally {
    // Zero out plaintext DEK buffer in memory
    dek.fill(0);
  }

  // 3. Optional end-to-end SHA-256 integrity verification
  if (expectedSha256) {
    const computedHash = calculateSHA256(decryptedBuffer);
    if (computedHash.toLowerCase() !== expectedSha256.toLowerCase()) {
      const error = new Error('SHA-256 integrity check failed: Decrypted file checksum does not match original upload checksum.');
      error.code = 'ERR_SHA256_MISMATCH';
      throw error;
    }
  }

  return decryptedBuffer;
}

module.exports = {
  ALGORITHM,
  KEY_LENGTH_BYTES,
  GCM_IV_LENGTH_BYTES,
  GCM_AUTH_TAG_LENGTH_BYTES,
  getMasterKey,
  calculateSHA256,
  generateDEK,
  generateIV,
  wrapKey,
  unwrapKey,
  encryptFile,
  decryptFile,
  encryptFileWithEnvelope,
  decryptFileWithEnvelope
};
