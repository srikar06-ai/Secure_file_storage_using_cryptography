/**
 * File Ingestion & Encrypted Storage Integration Test Suite
 * File: tests/file.test.js
 * 
 * Tests authenticated file upload, AES-256-GCM envelope encryption,
 * ciphertext disk persistence, prohibited extension rejection, and audit log generation.
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const fs = require('fs');
const app = require('../app');
const { User, File, AuditLog } = require('../src/models');
const { getStorageFilePath, deleteStoredFile } = require('../src/utils/fileUtils');

describe('PHASE 5: Secure File Upload & Encrypted Storage Suite', () => {
  let mongoServer;
  let authToken;
  let testUser;
  const createdFilesToClean = [];

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    await User.init();
    await File.init();
    await AuditLog.init();

    // Register a test user and obtain auth token
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'uploader_alice',
        email: 'uploader@crypto6.edu',
        password: 'SecurePassword123!'
      });

    authToken = registerRes.body.data.token;
    testUser = registerRes.body.data.user;
  }, 60000);

  afterAll(async () => {
    // Clean up test files written to disk
    for (const storedId of createdFilesToClean) {
      await deleteStoredFile(storedId);
    }

    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  const plaintextPayload = 'CONFIDENTIAL ACADEMIC PROJECT REPORT - CRYPTO6 MSD';
  const sampleBuffer = Buffer.from(plaintextPayload, 'utf8');

  // ============================================================================
  // 1. SUCCESSFUL UPLOAD & ENCRYPTED STORAGE VERIFICATION
  // ============================================================================
  it('should encrypt uploaded file on-the-fly and save ciphertext to storage/encrypted/', async () => {
    const res = await request(app)
      .post('/api/files/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', sampleBuffer, 'project_report.txt');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('stored securely');

    const fileData = res.body.data;
    expect(fileData).toHaveProperty('_id');
    expect(fileData.originalName).toBe('project_report.txt');
    expect(fileData.size).toBe(sampleBuffer.length);
    expect(fileData.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(fileData.storedIdentifier).toMatch(/^[a-f0-9-]+\.enc$/);

    // Ensure hidden cryptographic fields are NEVER exposed in the API response
    expect(fileData.crypto).not.toHaveProperty('authTag');
    expect(fileData.crypto).not.toHaveProperty('wrappedKey');
    expect(fileData.crypto).toHaveProperty('algorithm', 'AES-256-GCM');
    expect(fileData.crypto).toHaveProperty('iv');

    createdFilesToClean.push(fileData.storedIdentifier);

    // Verify physical file on disk
    const diskPath = getStorageFilePath(fileData.storedIdentifier);
    expect(fs.existsSync(diskPath)).toBe(true);

    // Verify the file stored on disk is CIPHERTEXT and does NOT equal plaintext!
    const diskCiphertext = fs.readFileSync(diskPath);
    expect(diskCiphertext).not.toEqual(sampleBuffer);
    expect(diskCiphertext.toString('utf8')).not.toContain('CONFIDENTIAL');

    // Verify MongoDB document exists
    const dbFile = await File.findById(fileData._id);
    expect(dbFile).not.toBeNull();
    expect(dbFile.owner.toString()).toBe(testUser._id.toString());

    // Verify UPLOAD audit log was generated
    const audit = await AuditLog.findOne({
      action: 'UPLOAD',
      file: dbFile._id
    });
    expect(audit).not.toBeNull();
    expect(audit.status).toBe('success');
    expect(audit.details.originalName).toBe('project_report.txt');
  });

  // ============================================================================
  // 2. SECURITY & REJECTION TESTS
  // ============================================================================
  it('should reject unauthenticated upload attempts (401 Unauthorized)', async () => {
    const res = await request(app)
      .post('/api/files/upload')
      .attach('file', sampleBuffer, 'unauth.txt');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should reject request when no file is attached (400 Bad Request)', async () => {
    const res = await request(app)
      .post('/api/files/upload')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('No file uploaded');
  });

  it('should reject dangerous executable files (.exe) for security reasons (400)', async () => {
    const res = await request(app)
      .post('/api/files/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', Buffer.from('malicious payload'), 'exploit.exe');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Executable files and dangerous script extensions are strictly prohibited');
  });

  it('should reject batch script files (.bat) for security reasons (400)', async () => {
    const res = await request(app)
      .post('/api/files/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', Buffer.from('echo hello'), 'script.bat');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('strictly prohibited');
  });
});
