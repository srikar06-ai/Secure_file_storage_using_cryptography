/**
 * Mongoose Models Unit & Integration Test Suite (Backend Layer)
 * File: tests/models.test.js
 * 
 * Tests User, File, Share, and AuditLog models using MongoMemoryServer.
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { User, File, Share, AuditLog } = require('../src/models');

jest.setTimeout(60000);

describe('PHASE 2: Backend Models & Schema Security Suite', () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri, {
      driverInfo: {
        name: 'nodejs',
        version: process.version
      }
    });

    // Initialize schema indexes
    await User.init();
    await File.init();
    await Share.init();
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  // User Tests
  describe('User Model', () => {
    it('should create user with active status and hidden passwordHash', async () => {
      const user = await User.create({
        username: 'secure_user1',
        email: 'user1@crypto6.edu',
        passwordHash: '$2a$12$e868d4a66a1a4f00b9557626d83a1234'
      });

      expect(user._id).toBeDefined();
      expect(user.role).toBe('user');
      expect(user.status).toBe('active');

      const queried = await User.findById(user._id);
      expect(queried.passwordHash).toBeUndefined();
    });

    it('should reject invalid email format', async () => {
      await expect(
        User.create({
          username: 'invalid_user',
          email: 'not-an-email',
          passwordHash: 'hash123'
        })
      ).rejects.toThrow();
    });

    it('should verify account lockout methods', async () => {
      const lockedUser = new User({
        username: 'locked_usr',
        email: 'locked@crypto6.edu',
        passwordHash: 'hash123',
        lockedUntil: new Date(Date.now() + 60000)
      });
      expect(lockedUser.isAccountLocked()).toBe(true);
    });
  });

  // File Tests
  describe('File Model', () => {
    let owner;

    beforeAll(async () => {
      owner = await User.create({
        username: 'file_owner_jest',
        email: 'jestowner@crypto6.edu',
        passwordHash: 'hash'
      });
    });

    it('should create file and validate 12-byte IV and 16-byte authTag constraints', async () => {
      const file = await File.create({
        owner: owner._id,
        originalName: 'secret.txt',
        storedIdentifier: 'uuid-test-1234',
        size: 2048,
        mimeType: 'text/plain',
        sha256: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        crypto: {
          algorithm: 'AES-256-GCM',
          version: '1.0',
          iv: Buffer.alloc(12, 0x01),
          authTag: Buffer.alloc(16, 0x02),
          wrappedKey: Buffer.alloc(48, 0x03)
        }
      });

      expect(file._id).toBeDefined();
      expect(file.isDeleted).toBe(false);

      // Verify soft delete
      await file.softDelete();
      expect(file.isDeleted).toBe(true);
      expect(file.deletedAt).toBeDefined();

      // Verify restore
      await file.restore();
      expect(file.isDeleted).toBe(false);
      expect(file.deletedAt).toBeNull();
    });

    it('should reject IV buffer with length not equal to 12 bytes', async () => {
      await expect(
        File.create({
          owner: owner._id,
          originalName: 'bad.txt',
          storedIdentifier: 'bad-iv-123',
          size: 100,
          sha256: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
          crypto: {
            iv: Buffer.alloc(16), // 16 bytes is invalid for AES-GCM IV
            authTag: Buffer.alloc(16),
            wrappedKey: Buffer.alloc(48)
          }
        })
      ).rejects.toThrow(/12 bytes/);
    });
  });

  // Share Tests
  describe('Share Model', () => {
    it('should create a valid share record and verify expiration/revocation methods', async () => {
      const share = new Share({
        file: new mongoose.Types.ObjectId(),
        owner: new mongoose.Types.ObjectId(),
        permission: 'read',
        wrappedKey: Buffer.alloc(48),
        expiresAt: new Date(Date.now() + 3600000)
      });

      expect(share.isValid()).toBe(true);
      expect(share.isExpired()).toBe(false);
      expect(share.isRevoked()).toBe(false);

      share.revokedAt = new Date();
      expect(share.isValid()).toBe(false);
      expect(share.isRevoked()).toBe(true);
    });
  });

  // AuditLog Tests
  describe('AuditLog Model (Append-Only Enforcement)', () => {
    let logEntry;

    it('should create an audit log and block mutations', async () => {
      logEntry = await AuditLog.create({
        action: 'REGISTER',
        ipAddress: '127.0.0.1',
        userAgent: 'JestTestRunner',
        status: 'success',
        details: { note: 'Initial test entry' }
      });

      expect(logEntry._id).toBeDefined();

      // Mutation attempt must be rejected
      await expect(
        AuditLog.updateOne({ _id: logEntry._id }, { action: 'DELETE' })
      ).rejects.toThrow(/AuditLog records are append-only/);

      // Deletion attempt must be rejected
      await expect(
        AuditLog.deleteOne({ _id: logEntry._id })
      ).rejects.toThrow(/AuditLog records are append-only/);
    });
  });
});
