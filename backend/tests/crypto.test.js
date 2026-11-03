/**
 * Cryptography Service Unit Test Suite
 * File: tests/crypto.test.js
 * 
 * Tests AES-256-GCM encryption/decryption, envelope key wrapping,
 * random nonce generation, bit-flipping/tamper rejection, and SHA-256 integrity verification.
 */

const crypto = require('crypto');
const cryptoService = require('../src/services/cryptoService');

describe('PHASE 4: Cryptography & Envelope Encryption Engine Suite', () => {
  const samplePlaintext = Buffer.from(
    'SECURE FILE STORAGE USING CRYPTOGRAPHY - CRYPTO6 MSD. Highly confidential document containing proprietary research.'
  );

  // ============================================================================
  // 1. BASIC AES-256-GCM ENCRYPTION & DECRYPTION
  // ============================================================================
  describe('AES-256-GCM File Encryption & Decryption', () => {
    it('should encrypt and decrypt file buffer restoring exact original plaintext', () => {
      const dek = cryptoService.generateDEK();
      const { encryptedBuffer, iv, authTag } = cryptoService.encryptFile(samplePlaintext, dek);

      expect(encryptedBuffer).not.toEqual(samplePlaintext);
      expect(iv.length).toBe(12); // Exactly 96 bits
      expect(authTag.length).toBe(16); // Exactly 128 bits

      const decrypted = cryptoService.decryptFile(encryptedBuffer, dek, iv, authTag);
      expect(decrypted).toEqual(samplePlaintext);
      expect(decrypted.toString('utf8')).toBe(samplePlaintext.toString('utf8'));
    });

    it('should generate a unique 96-bit nonce for each encryption operation (No Nonce Reuse)', () => {
      const dek = cryptoService.generateDEK();

      const run1 = cryptoService.encryptFile(samplePlaintext, dek);
      const run2 = cryptoService.encryptFile(samplePlaintext, dek);

      // Even with the identical plaintext and identical key, IVs and Ciphertexts must be different
      expect(run1.iv).not.toEqual(run2.iv);
      expect(run1.encryptedBuffer).not.toEqual(run2.encryptedBuffer);
      expect(run1.authTag).not.toEqual(run2.authTag);

      // Both must decrypt cleanly back to the same plaintext
      expect(cryptoService.decryptFile(run1.encryptedBuffer, dek, run1.iv, run1.authTag)).toEqual(samplePlaintext);
      expect(cryptoService.decryptFile(run2.encryptedBuffer, dek, run2.iv, run2.authTag)).toEqual(samplePlaintext);
    });
  });

  // ============================================================================
  // 2. CRYPTOGRAPHIC TAMPER DETECTION & ERROR REJECTION
  // ============================================================================
  describe('Tamper Detection & Authenticity Enforcement', () => {
    let dek, encryptedBuffer, iv, authTag;

    beforeEach(() => {
      dek = cryptoService.generateDEK();
      const enc = cryptoService.encryptFile(samplePlaintext, dek);
      encryptedBuffer = Buffer.from(enc.encryptedBuffer); // Clone buffer
      iv = Buffer.from(enc.iv);
      authTag = Buffer.from(enc.authTag);
    });

    it('should reject decryption when ciphertext has been tampered with (bit-flipping attack)', () => {
      // Flip a single bit in the ciphertext buffer
      encryptedBuffer[5] ^= 0x01;

      expect(() => {
        cryptoService.decryptFile(encryptedBuffer, dek, iv, authTag);
      }).toThrow(/Cryptographic integrity check failed/);
    });

    it('should reject decryption when authentication tag is incorrect or modified', () => {
      // Modify authentication tag
      authTag[0] ^= 0xff;

      expect(() => {
        cryptoService.decryptFile(encryptedBuffer, dek, iv, authTag);
      }).toThrow(/Cryptographic integrity check failed/);
    });

    it('should reject decryption when an incorrect encryption key is supplied', () => {
      const wrongDek = cryptoService.generateDEK();

      expect(() => {
        cryptoService.decryptFile(encryptedBuffer, wrongDek, iv, authTag);
      }).toThrow(/Cryptographic integrity check failed/);
    });

    it('should reject invalid IV length (must be exactly 12 bytes)', () => {
      const badIv = Buffer.alloc(16); // 16 bytes is invalid

      expect(() => {
        cryptoService.decryptFile(encryptedBuffer, dek, badIv, authTag);
      }).toThrow(/Invalid IV length: Expected 12 bytes/);
    });

    it('should reject invalid authTag length (must be exactly 16 bytes)', () => {
      const badTag = Buffer.alloc(8); // 8 bytes is invalid

      expect(() => {
        cryptoService.decryptFile(encryptedBuffer, dek, iv, badTag);
      }).toThrow(/Invalid AuthTag length: Expected 16 bytes/);
    });
  });

  // ============================================================================
  // 3. ENVELOPE ENCRYPTION (KEY WRAPPING & UNWRAPPING)
  // ============================================================================
  describe('Envelope Encryption & DEK Wrapping', () => {
    it('should wrap a 32-byte DEK into a 60-byte protected buffer and unwrap it cleanly', () => {
      const originalDek = cryptoService.generateDEK();
      const wrappedKey = cryptoService.wrapKey(originalDek);

      // 12 (IV) + 16 (AuthTag) + 32 (Encrypted DEK) = 60 bytes
      expect(wrappedKey.length).toBe(60);
      expect(wrappedKey).not.toEqual(originalDek);

      const unwrappedDek = cryptoService.unwrapKey(wrappedKey);
      expect(unwrappedDek).toEqual(originalDek);
    });

    it('should fail unwrapping when wrapped key buffer has been tampered with', () => {
      const originalDek = cryptoService.generateDEK();
      const wrappedKey = cryptoService.wrapKey(originalDek);

      // Tamper with the wrapped key buffer
      wrappedKey[20] ^= 0xaa;

      expect(() => {
        cryptoService.unwrapKey(wrappedKey);
      }).toThrow(/Key unwrapping failed/);
    });

    it('should fail unwrapping when Master Key (KEK) is incorrect', () => {
      const originalDek = cryptoService.generateDEK();
      const wrongKek = crypto.randomBytes(32);
      const wrappedKey = cryptoService.wrapKey(originalDek);

      expect(() => {
        cryptoService.unwrapKey(wrappedKey, wrongKek);
      }).toThrow(/Key unwrapping failed/);
    });
  });

  // ============================================================================
  // 4. END-TO-END ENVELOPE ENCRYPTION WORKFLOW & SHA-256
  // ============================================================================
  describe('End-to-End File Envelope Workflow & SHA-256 Checksum', () => {
    it('should execute complete envelope encrypt and decrypt pipeline with SHA-256 verification', () => {
      const { encryptedBuffer, sha256, iv, authTag, wrappedKey } = cryptoService.encryptFileWithEnvelope(samplePlaintext);

      expect(sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(wrappedKey.length).toBe(60);

      // Decrypt using envelope helper
      const decrypted = cryptoService.decryptFileWithEnvelope(
        encryptedBuffer,
        wrappedKey,
        iv,
        authTag,
        sha256
      );

      expect(decrypted).toEqual(samplePlaintext);
      expect(cryptoService.calculateSHA256(decrypted)).toBe(sha256);
    });

    it('should reject end-to-end decryption if expected SHA-256 hash does not match', () => {
      const { encryptedBuffer, iv, authTag, wrappedKey } = cryptoService.encryptFileWithEnvelope(samplePlaintext);

      const forgedHash = '0000000000000000000000000000000000000000000000000000000000000000';

      expect(() => {
        cryptoService.decryptFileWithEnvelope(encryptedBuffer, wrappedKey, iv, authTag, forgedHash);
      }).toThrow(/SHA-256 integrity check failed/);
    });
  });
});
