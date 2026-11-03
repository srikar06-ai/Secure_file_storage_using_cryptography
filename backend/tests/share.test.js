/**
 * Phase 3: Share & Audit Route Integration Tests
 * File: tests/share.test.js
 *
 * Tests for: share creation, listing, token verification, revocation,
 * shared-with-me, audit log self-service, and RBAC enforcement.
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const { connectDB, disconnectDB } = require('../src/config/db');

// ─── Test Data ────────────────────────────────────────────────────────────────

const ownerUser = {
  username: 'shareowner',
  email: 'shareowner@crypto6test.com',
  password: 'Secure@Pass1!'
};

const recipientUser = {
  username: 'sharerecipient',
  email: 'sharerecipient@crypto6test.com',
  password: 'Secure@Pass2!'
};

let ownerToken = '';
let recipientToken = '';
let uploadedFileId = '';
let shareId = '';
let rawShareToken = '';

// ─── Lifecycle ─────────────────────────────────────────────────────────────────

beforeAll(async () => {
  await connectDB();

  // Register owner (ignore 409 conflict if already exists)
  await request(app).post('/api/auth/register').send(ownerUser);

  // Login owner
  const ownerLogin = await request(app).post('/api/auth/login')
    .send({ email: ownerUser.email, password: ownerUser.password });
  expect(ownerLogin.status).toBe(200);
  ownerToken = ownerLogin.body.data.token;

  // Register recipient (ignore 409 conflict if already exists)
  await request(app).post('/api/auth/register').send(recipientUser);

  // Login recipient
  const recipientLogin = await request(app).post('/api/auth/login')
    .send({ email: recipientUser.email, password: recipientUser.password });
  expect(recipientLogin.status).toBe(200);
  recipientToken = recipientLogin.body.data.token;

  // Upload a test file as owner
  const { File, User } = require('../src/models');
  const cryptoService = require('../src/services/cryptoService');
  const { generateStorageIdentifier, writeEncryptedFile } = require('../src/utils/fileUtils');

  const testBuffer = Buffer.from('Hello Phase 3 share test content');
  const { encryptedBuffer, sha256, iv, authTag, wrappedKey } = cryptoService.encryptFileWithEnvelope(testBuffer);
  const storedIdentifier = generateStorageIdentifier();
  await writeEncryptedFile(storedIdentifier, encryptedBuffer);

  const ownerDoc = await User.findOne({ email: ownerUser.email });

  const fileDoc = await File.create({
    owner: ownerDoc._id,
    originalName: 'share-test.txt',
    storedIdentifier,
    size: testBuffer.length,
    mimeType: 'text/plain',
    sha256,
    crypto: { algorithm: 'AES-256-GCM', version: '1.0', iv, authTag, wrappedKey }
  });

  uploadedFileId = fileDoc._id.toString();
});

afterAll(async () => {
  const { User, File, Share } = require('../src/models');
  // Delete users individually to avoid Mongoose 8 $in cast issues on unique email field
  await User.deleteOne({ email: 'shareowner@crypto6test.com' });
  await User.deleteOne({ email: 'sharerecipient@crypto6test.com' });
  await User.deleteOne({ email: 'noshare@crypto6test.com' });
  if (uploadedFileId) {
    await File.deleteOne({ _id: new mongoose.Types.ObjectId(uploadedFileId) });
    await Share.deleteMany({ file: new mongoose.Types.ObjectId(uploadedFileId) });
  }
  await disconnectDB();
});

// ─── Share Routes ─────────────────────────────────────────────────────────────

describe('POST /api/shares — Create Share Grant', () => {
  it('should reject unauthenticated share requests', async () => {
    const res = await request(app).post('/api/shares').send({ fileId: uploadedFileId });
    expect(res.status).toBe(401);
  });

  it('should create a share grant with token for a recipient user', async () => {
    const res = await request(app)
      .post('/api/shares')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        fileId: uploadedFileId,
        recipientEmail: recipientUser.email,
        permission: 'download',
        expiresInHours: 24
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('share');
    expect(res.body.data).toHaveProperty('rawToken');
    expect(res.body.data.share).toHaveProperty('permission', 'download');
    expect(res.body.data.share).toHaveProperty('expiresAt');

    shareId = res.body.data.share._id;
    rawShareToken = res.body.data.rawToken;
  });

  it('should reject duplicate active share for same recipient', async () => {
    const res = await request(app)
      .post('/api/shares')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        fileId: uploadedFileId,
        recipientEmail: recipientUser.email,
        permission: 'read'
      });

    expect(res.status).toBe(409); // Conflict
  });

  it('should reject sharing a file the user does not own', async () => {
    const res = await request(app)
      .post('/api/shares')
      .set('Authorization', `Bearer ${recipientToken}`)
      .send({
        fileId: uploadedFileId,
        permission: 'read'
      });

    expect(res.status).toBe(403);
  });

  it('should reject an invalid fileId format', async () => {
    const res = await request(app)
      .post('/api/shares')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ fileId: 'not-valid-objectid' });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/shares/file/:fileId — List File Shares', () => {
  it('should list all shares for a file owned by the user', async () => {
    const res = await request(app)
      .get(`/api/shares/file/${uploadedFileId}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    // Verify sensitive fields are excluded
    expect(res.body.data[0]).not.toHaveProperty('wrappedKey');
    expect(res.body.data[0]).not.toHaveProperty('shareTokenHash');
  });

  it('should deny access to share list for non-owners', async () => {
    const res = await request(app)
      .get(`/api/shares/file/${uploadedFileId}`)
      .set('Authorization', `Bearer ${recipientToken}`);

    expect(res.status).toBe(404);
  });
});

describe('GET /api/shares/shared-with-me — Shared With Me', () => {
  it('should show the recipient their shared files', async () => {
    const res = await request(app)
      .get('/api/shares/shared-with-me')
      .set('Authorization', `Bearer ${recipientToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0]).toHaveProperty('permission');
    expect(res.body.data[0]).not.toHaveProperty('wrappedKey');
  });

  it('should return empty list for a user with no shares', async () => {
    // Register and login a third user with no shares
    await request(app).post('/api/auth/register').send({
      username: 'noshareuser',
      email: 'noshare@crypto6test.local',
      password: 'Secure@Pass3!'
    });
    const login = await request(app).post('/api/auth/login')
      .send({ email: 'noshare@crypto6test.local', password: 'Secure@Pass3!' });
    const noShareToken = login.body.data.token;

    const res = await request(app)
      .get('/api/shares/shared-with-me')
      .set('Authorization', `Bearer ${noShareToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);

    // Cleanup extra user
    const { User } = require('../src/models');
    await User.deleteOne({ email: 'noshare@crypto6test.local' });
  });
});

describe('POST /api/shares/verify — Verify Share Token', () => {
  it('should verify a valid share token and return file metadata', async () => {
    const res = await request(app)
      .post('/api/shares/verify')
      .set('Authorization', `Bearer ${recipientToken}`)
      .send({ token: rawShareToken });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('file');
    expect(res.body.data).toHaveProperty('permission', 'download');
    expect(res.body.data).toHaveProperty('shareId');
  });

  it('should reject an invalid/fake share token', async () => {
    const res = await request(app)
      .post('/api/shares/verify')
      .set('Authorization', `Bearer ${recipientToken}`)
      .send({ token: 'completely-invalid-fake-token-that-does-not-exist-xyz' });

    expect(res.status).toBe(404);
  });

  it('should require a token in the request body', async () => {
    const res = await request(app)
      .post('/api/shares/verify')
      .set('Authorization', `Bearer ${recipientToken}`)
      .send({});

    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/shares/:shareId — Revoke Share', () => {
  it('should prevent recipient from revoking a share they do not own', async () => {
    const res = await request(app)
      .delete(`/api/shares/${shareId}`)
      .set('Authorization', `Bearer ${recipientToken}`);

    expect(res.status).toBe(403);
  });

  it('should allow owner to revoke a share', async () => {
    const res = await request(app)
      .delete(`/api/shares/${shareId}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('revokedAt');
  });

  it('should reject re-revoking an already revoked share', async () => {
    const res = await request(app)
      .delete(`/api/shares/${shareId}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(409);
  });

  it('should prevent access to revoked share via token', async () => {
    const res = await request(app)
      .post('/api/shares/verify')
      .set('Authorization', `Bearer ${recipientToken}`)
      .send({ token: rawShareToken });

    expect(res.status).toBe(403);
  });
});

// ─── Audit Routes ─────────────────────────────────────────────────────────────

describe('GET /api/audit/me — Self Audit Logs', () => {
  it('should return own audit logs for authenticated user', async () => {
    const res = await request(app)
      .get('/api/audit/me')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('logs');
    expect(res.body.data).toHaveProperty('pagination');
    expect(Array.isArray(res.body.data.logs)).toBe(true);
  });

  it('should reject unauthenticated access to audit logs', async () => {
    const res = await request(app).get('/api/audit/me');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/audit/me/summary — Audit Summary', () => {
  it('should return an action-grouped summary of activity', async () => {
    const res = await request(app)
      .get('/api/audit/me/summary')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('GET /api/audit/file/:fileId — File Audit Logs', () => {
  it('should return audit logs for a file the user owns', async () => {
    const res = await request(app)
      .get(`/api/audit/file/${uploadedFileId}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('logs');
    expect(Array.isArray(res.body.data.logs)).toBe(true);
  });

  it('should deny access to file audit logs for non-owners', async () => {
    const res = await request(app)
      .get(`/api/audit/file/${uploadedFileId}`)
      .set('Authorization', `Bearer ${recipientToken}`);

    expect(res.status).toBe(403);
  });
});

describe('GET /api/audit/system — System Audit Logs (Admin Only)', () => {
  it('should deny access to system logs for regular users', async () => {
    const res = await request(app)
      .get('/api/audit/system')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(403);
  });
});

// ─── File List & Metadata Routes ──────────────────────────────────────────────

describe('GET /api/files — List Files', () => {
  it('should return paginated file list for authenticated user', async () => {
    const res = await request(app)
      .get('/api/files')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('files');
    expect(res.body.data).toHaveProperty('pagination');
    expect(Array.isArray(res.body.data.files)).toBe(true);
    // Crypto details must not appear in list view
    res.body.data.files.forEach(f => {
      expect(f).not.toHaveProperty('crypto');
    });
  });

  it('should support search query filtering', async () => {
    const res = await request(app)
      .get('/api/files?search=share-test')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.files.length).toBeGreaterThanOrEqual(1);
  });

  it('should return an empty list for a user with no files', async () => {
    const res = await request(app)
      .get('/api/files')
      .set('Authorization', `Bearer ${recipientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.files).toHaveLength(0);
  });
});

describe('GET /api/files/:id — File Metadata', () => {
  it('should return metadata for a file the user owns', async () => {
    const res = await request(app)
      .get(`/api/files/${uploadedFileId}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('originalName', 'share-test.txt');
    expect(res.body.data.crypto).not.toHaveProperty('wrappedKey');
    expect(res.body.data.crypto).not.toHaveProperty('authTag');
  });

  it('should deny access to metadata for unauthorized users', async () => {
    const res = await request(app)
      .get(`/api/files/${uploadedFileId}`)
      .set('Authorization', `Bearer ${recipientToken}`);

    expect(res.status).toBe(404); // Zero-leakage
  });

  it('should return 404 for a non-existent file ID', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .get(`/api/files/${fakeId}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(404);
  });
});

// ─── User Profile Routes ───────────────────────────────────────────────────────

describe('GET /api/users/me — User Profile', () => {
  it('should return the authenticated user profile', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user).toHaveProperty('email', ownerUser.email);
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
  });

  it('should reject unauthenticated profile requests', async () => {
    const res = await request(app).get('/api/users/me');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/users — Admin User List (Admin Only)', () => {
  it('should deny access to user list for regular users', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(403);
  });
});
