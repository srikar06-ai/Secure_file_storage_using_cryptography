/**
 * Mongoose Models Automated Test Suite (Database Layer)
 * File: secure-file-db/tests/models.test.js
 * 
 * Tests all 4 collections: User, File, FileShare, AuditLog.
 * Verifies schema validations, hidden fields, and append-only audit enforcement.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { User, File, FileShare, AuditLog } from '../src/models/index.js';

describe('PHASE 2: Mongoose Schemas & Security Constraints Suite', () => {
  let replSet;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({
      replSet: { name: 'rs0', count: 1, storageEngine: 'wiredTiger' }
    });
    await replSet.waitUntilRunning();
    await mongoose.connect(replSet.getUri('secure_file_storage'));

    // Wait for Mongoose to establish unique indexes in the MongoDB collection
    await User.init();
    await File.init();
    await FileShare.init();
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (replSet) {
      await replSet.stop();
    }
  });

  // ============================================================================
  // USER MODEL TESTS
  // ============================================================================
  describe('User Model', () => {
    it('should create a valid user with default active status and user role', async () => {
      const user = await User.create({
        username: 'alice_crypto',
        email: 'alice@crypto6.edu',
        passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$fake_hash_value'
      });

      expect(user._id).toBeDefined();
      expect(user.role).toBe('user');
      expect(user.status).toBe('active');
      expect(user.failedLogins).toBe(0);
      expect(user.lockedUntil).toBeNull();
      expect(user.createdAt).toBeDefined();
    });

    it('should reject duplicate username or email', async () => {
      await expect(
        User.create({
          username: 'alice_crypto', // Duplicate
          email: 'different@crypto6.edu',
          passwordHash: 'hash123'
        })
      ).rejects.toThrow();

      await expect(
        User.create({
          username: 'different_user',
          email: 'alice@crypto6.edu', // Duplicate
          passwordHash: 'hash123'
        })
      ).rejects.toThrow();
    });

    it('should reject invalid email format', async () => {
      await expect(
        User.create({
          username: 'bob_invalid',
          email: 'not-an-email',
          passwordHash: 'hash123'
        })
      ).rejects.toThrow(/valid email address/);
    });

    it('should not include passwordHash in normal queries or JSON serialization', async () => {
      const foundUser = await User.findOne({ username: 'alice_crypto' });
      expect(foundUser.passwordHash).toBeUndefined();

      const jsonUser = foundUser.toJSON();
      expect(jsonUser.passwordHash).toBeUndefined();

      // Explicitly selecting it should reveal it for auth verification
      const userWithHash = await User.findOne({ username: 'alice_crypto' }).select('+passwordHash');
      expect(userWithHash.passwordHash).toBeDefined();
    });

    it('should accurately calculate account lockout status', async () => {
      const lockedUser = await User.create({
        username: 'charlie_locked',
        email: 'charlie@crypto6.edu',
        passwordHash: 'hash123',
        failedLogins: 5,
        lockedUntil: new Date(Date.now() + 15 * 60 * 1000) // 15 mins in future
      });

      expect(lockedUser.isAccountLocked()).toBe(true);

      const unlockedUser = await User.create({
        username: 'david_unlocked',
        email: 'david@crypto6.edu',
        passwordHash: 'hash123',
        lockedUntil: new Date(Date.now() - 1000) // Past date
      });

      expect(unlockedUser.isAccountLocked()).toBe(false);
    });
  });

  // ============================================================================
  // FILE MODEL TESTS
  // ============================================================================
  describe('File Model', () => {
    let testOwner;

    beforeAll(async () => {
      testOwner = await User.create({
        username: 'file_owner',
        email: 'owner@crypto6.edu',
        passwordHash: 'hash123'
      });
    });

    it('should create a valid encrypted file metadata record', async () => {
      const file = await File.create({
        owner: testOwner._id,
        originalName: 'confidential_project.pdf',
        storagePath: 'storage/encrypted/uuid-1234.enc',
        size: 1048576,
        mimeType: 'application/pdf',
        sha256: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
        crypto: {
          algorithm: 'AES-256-GCM',
          version: '1.0',
          iv: Buffer.alloc(12, 0xaa), // 12-byte IV
          authTag: Buffer.alloc(16, 0xbb), // 16-byte authTag
          wrappedKey: Buffer.alloc(48, 0xcc) // Wrapped DEK
        }
      });

      expect(file._id).toBeDefined();
      expect(file.isDeleted).toBe(false);
    });

    it('should reject invalid IV length (must be exactly 12 bytes)', async () => {
      await expect(
        File.create({
          owner: testOwner._id,
          originalName: 'bad_iv.pdf',
          storagePath: 'storage/encrypted/bad_iv.enc',
          size: 1024,
          sha256: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
          crypto: {
            iv: Buffer.alloc(16), // Invalid: 16 bytes instead of 12
            authTag: Buffer.alloc(16),
            wrappedKey: Buffer.alloc(48)
          }
        })
      ).rejects.toThrow(/12 bytes/);
    });

    it('should reject invalid authTag length (must be exactly 16 bytes)', async () => {
      await expect(
        File.create({
          owner: testOwner._id,
          originalName: 'bad_tag.pdf',
          storagePath: 'storage/encrypted/bad_tag.enc',
          size: 1024,
          sha256: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
          crypto: {
            iv: Buffer.alloc(12),
            authTag: Buffer.alloc(8), // Invalid: 8 bytes instead of 16
            wrappedKey: Buffer.alloc(48)
          }
        })
      ).rejects.toThrow(/16 bytes/);
    });

    it('should reject invalid SHA-256 format', async () => {
      await expect(
        File.create({
          owner: testOwner._id,
          originalName: 'bad_hash.pdf',
          storagePath: 'storage/encrypted/bad_hash.enc',
          size: 1024,
          sha256: 'not-a-valid-sha256-hash', // Invalid
          crypto: {
            iv: Buffer.alloc(12),
            authTag: Buffer.alloc(16),
            wrappedKey: Buffer.alloc(48)
          }
        })
      ).rejects.toThrow(/SHA-256/);
    });

    it('should hide wrappedKey and authTag by default in normal queries', async () => {
      const file = await File.findOne({ originalName: 'confidential_project.pdf' });
      expect(file.crypto.authTag).toBeUndefined();
      expect(file.crypto.wrappedKey).toBeUndefined();
      expect(file.crypto.iv).toBeDefined(); // IV is public
    });
  });

  // ============================================================================
  // FILESHARE MODEL TESTS
  // ============================================================================
  describe('FileShare Model', () => {
    let testOwner, testRecipient, testFile;

    beforeAll(async () => {
      testOwner = await User.create({
        username: 'share_owner',
        email: 'shareowner@crypto6.edu',
        passwordHash: 'hash123'
      });

      testRecipient = await User.create({
        username: 'share_recipient',
        email: 'recipient@crypto6.edu',
        passwordHash: 'hash123'
      });

      testFile = await File.create({
        owner: testOwner._id,
        originalName: 'shared_doc.txt',
        storagePath: 'storage/encrypted/shared.enc',
        size: 512,
        sha256: '11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff',
        crypto: {
          iv: Buffer.alloc(12, 1),
          authTag: Buffer.alloc(16, 2),
          wrappedKey: Buffer.alloc(48, 3)
        }
      });
    });

    it('should create a valid file share with wrapped key hidden by default', async () => {
      const share = await FileShare.create({
        file: testFile._id,
        owner: testOwner._id,
        sharedWith: testRecipient._id,
        permission: 'read',
        wrappedKey: Buffer.alloc(48, 9),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });

      expect(share._id).toBeDefined();
      expect(share.isValid()).toBe(true);

      const foundShare = await FileShare.findById(share._id);
      expect(foundShare.wrappedKey).toBeUndefined();
    });

    it('should accurately detect expired and revoked shares', async () => {
      const expiredShare = new FileShare({
        file: testFile._id,
        owner: testOwner._id,
        sharedWith: new mongoose.Types.ObjectId(),
        wrappedKey: Buffer.alloc(48),
        expiresAt: new Date(Date.now() - 5000)
      });
      expect(expiredShare.isExpired()).toBe(true);
      expect(expiredShare.isValid()).toBe(false);

      const revokedShare = new FileShare({
        file: testFile._id,
        owner: testOwner._id,
        sharedWith: new mongoose.Types.ObjectId(),
        wrappedKey: Buffer.alloc(48),
        revokedAt: new Date()
      });
      expect(revokedShare.isRevoked()).toBe(true);
      expect(revokedShare.isValid()).toBe(false);
    });
  });

  // ============================================================================
  // AUDITLOG MODEL TESTS (APPEND-ONLY ENFORCEMENT)
  // ============================================================================
  describe('AuditLog Model (Append-Only Guarantees)', () => {
    let auditEntry;

    it('should successfully append a security audit record', async () => {
      auditEntry = await AuditLog.create({
        action: 'UPLOAD',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 PostmanRuntime',
        status: 'success',
        details: { filename: 'secure_data.enc' }
      });

      expect(auditEntry._id).toBeDefined();
      expect(auditEntry.action).toBe('UPLOAD');
      expect(auditEntry.createdAt).toBeDefined();
    });

    it('should strictly reject updateOne operations on audit records', async () => {
      await expect(
        AuditLog.updateOne({ _id: auditEntry._id }, { action: 'DELETE' })
      ).rejects.toThrow(/AuditLog records are append-only/);
    });

    it('should strictly reject findOneAndUpdate operations on audit records', async () => {
      await expect(
        AuditLog.findOneAndUpdate({ _id: auditEntry._id }, { status: 'failure' })
      ).rejects.toThrow(/AuditLog records are append-only/);
    });

    it('should strictly reject deleteOne and deleteMany operations on audit records', async () => {
      await expect(
        AuditLog.deleteOne({ _id: auditEntry._id })
      ).rejects.toThrow(/AuditLog records are append-only/);

      await expect(
        AuditLog.deleteMany({ action: 'UPLOAD' })
      ).rejects.toThrow(/AuditLog records are append-only/);
    });
  });
});
