/**
 * SECUREVAULT - Real Cryptography Engine (Web Crypto API)
 * Module: frontend/js/crypto-engine.js
 * 
 * Provides production-grade AES-256-GCM client-side encryption and decryption
 * using the W3C Web Cryptography Standard (window.crypto.subtle).
 * 
 * Works across ALL file types (PDF, images, videos, audio, docx, zip, exe, txt, etc.)
 * by preserving the exact binary stream and authenticating with PBKDF2 + AES-GCM 128-bit auth tag.
 */

const CryptoEngine = {
  /**
   * Derive a 256-bit AES-GCM CryptoKey from a passphrase using PBKDF2 (100,000 rounds)
   */
  async deriveKey(passphrase, saltBuffer) {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      enc.encode(passphrase),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBuffer,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  },

  /**
   * Calculate SHA-256 hex digest of an ArrayBuffer
   */
  async calculateSHA256(arrayBuffer) {
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  /**
   * Encrypt arbitrary file buffer using AES-256-GCM
   * Returns: { encryptedPayloadBase64, saltHex, ivHex, sha256 }
   */
  async encryptBuffer(fileArrayBuffer, passphrase) {
    // 16-byte random salt for PBKDF2
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    // 12-byte random IV for AES-GCM
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const key = await this.deriveKey(passphrase, salt);

    // Compute SHA-256 checksum of original plaintext
    const sha256 = await this.calculateSHA256(fileArrayBuffer);

    // AES-256-GCM encryption (includes 16-byte auth tag at the end)
    const encryptedBuffer = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128
      },
      key,
      fileArrayBuffer
    );

    // Convert encrypted bytes to base64
    const encryptedBytes = new Uint8Array(encryptedBuffer);
    const encryptedBase64 = this.uint8ArrayToBase64(encryptedBytes);

    const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
    const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');

    return {
      ciphertextBase64: encryptedBase64,
      saltHex: saltHex,
      ivHex: ivHex,
      sha256: sha256
    };
  },

  /**
   * Decrypt AES-256-GCM payload back into original ArrayBuffer
   */
  async decryptBuffer(ciphertextBase64, saltHex, ivHex, passphrase) {
    const salt = new Uint8Array(saltHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    const iv = new Uint8Array(ivHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    const ciphertextBytes = this.base64ToUint8Array(ciphertextBase64);

    const key = await this.deriveKey(passphrase, salt);

    try {
      const decryptedBuffer = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv,
          tagLength: 128
        },
        key,
        ciphertextBytes
      );

      return decryptedBuffer;
    } catch (err) {
      throw new Error('Authentication failed: Invalid key/passphrase or file integrity compromised.');
    }
  },

  /**
   * Helper: Convert Uint8Array to Base64 (chunked to prevent call-stack overflows on large files)
   */
  uint8ArrayToBase64(bytes) {
    let binary = '';
    const len = bytes.byteLength;
    const chunkSize = 8192;
    for (let i = 0; i < len; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
      binary += String.fromCharCode.apply(null, chunk);
    }
    return window.btoa(binary);
  },

  /**
   * Helper: Convert Base64 to Uint8Array
   */
  base64ToUint8Array(base64) {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }
};

window.CryptoEngine = CryptoEngine;

