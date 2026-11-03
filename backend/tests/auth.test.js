/**
 * Authentication Endpoints Integration Test Suite
 * File: tests/auth.test.js
 * 
 * Tests user registration, password hashing, account lockout after 5 failures,
 * JWT token generation, protected /me endpoint, and security audit log entries.
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');
const { User, AuditLog } = require('../src/models');

describe('PHASE 3: Authentication & JWT Security Suite', () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    await User.init();
    await AuditLog.init();
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  const validUserData = {
    username: 'crypto_student',
    email: 'student@crypto6.edu',
    password: 'SecureP@ssw0rd2026!'
  };

  // ============================================================================
  // REGISTRATION TESTS
  // ============================================================================
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully and return 201 with token', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(validUserData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user).toMatchObject({
        username: validUserData.username,
        email: validUserData.email,
        role: 'user',
        status: 'active'
      });

      // Ensure password hash is NEVER leaked in response
      expect(res.body.data.user).not.toHaveProperty('passwordHash');

      // Verify AuditLog entry was created
      const auditEntry = await AuditLog.findOne({
        action: 'REGISTER',
        'details.username': validUserData.username
      });
      expect(auditEntry).not.toBeNull();
      expect(auditEntry.status).toBe('success');
    });

    it('should reject registration with a duplicate username (409 Conflict)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: validUserData.username, // Duplicate
          email: 'different@crypto6.edu',
          password: 'AnotherSecureP@ss1'
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already taken');
    });

    it('should reject registration with a duplicate email (409 Conflict)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'unique_user_99',
          email: validUserData.email, // Duplicate
          password: 'AnotherSecureP@ss1'
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already exists');
    });

    it('should reject weak password missing special character or uppercase (400)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'weak_pass_user',
          email: 'weak@crypto6.edu',
          password: 'weakpassword1' // Missing uppercase and special char
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Validation failed');
    });
  });

  // ============================================================================
  // LOGIN & ACCOUNT LOCKOUT TESTS
  // ============================================================================
  describe('POST /api/auth/login', () => {
    let authUserToken;

    it('should authenticate valid credentials and return 200 with JWT', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: validUserData.email,
          password: validUserData.password
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user.email).toBe(validUserData.email);
      expect(res.body.data.user).not.toHaveProperty('passwordHash');

      authUserToken = res.body.data.token;

      // Verify LOGIN audit log
      const audit = await AuditLog.findOne({
        action: 'LOGIN',
        'details.email': validUserData.email
      });
      expect(audit).not.toBeNull();
      expect(audit.status).toBe('success');
    });

    it('should reject invalid password with 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: validUserData.email,
          password: 'WrongPassword123!'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid email or password');
    });

    it('should enforce account lockout after 5 consecutive failed attempts', async () => {
      const lockoutUser = {
        username: 'brute_force_target',
        email: 'brute@crypto6.edu',
        password: 'ValidPassword123!'
      };

      // Register target user
      await request(app).post('/api/auth/register').send(lockoutUser);

      // Attempt 1 to 4: Failures with warning
      for (let attempt = 1; attempt <= 4; attempt++) {
        const failRes = await request(app).post('/api/auth/login').send({
          email: lockoutUser.email,
          password: 'IncorrectPassword!'
        });
        expect(failRes.status).toBe(401);
        expect(failRes.body.message).toContain(`Account will lock after ${5 - attempt}`);
      }

      // Attempt 5: Triggers 15-minute account lockout
      const lockRes = await request(app).post('/api/auth/login').send({
        email: lockoutUser.email,
        password: 'IncorrectPassword!'
      });
      expect(lockRes.status).toBe(423); // 423 Locked
      expect(lockRes.body.message).toContain('locked for 15 minutes');

      // Attempt 6 (Even with the CORRECT password): Must be rejected due to active lock!
      const attemptWhileLocked = await request(app).post('/api/auth/login').send({
        email: lockoutUser.email,
        password: lockoutUser.password // Correct password, but account is locked
      });
      expect(attemptWhileLocked.status).toBe(423);
      expect(attemptWhileLocked.body.message).toContain('Account is temporarily locked');
    });
  });

  // ============================================================================
  // PROTECTED ROUTE TESTS (/api/auth/me)
  // ============================================================================
  describe('GET /api/auth/me', () => {
    let validToken;

    beforeAll(async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: validUserData.email,
          password: validUserData.password
        });
      validToken = loginRes.body.data.token;
    });

    it('should return authenticated user profile when valid Bearer token is provided', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(validUserData.email);
      expect(res.body.data.user.username).toBe(validUserData.username);
    });

    it('should reject request when Authorization header is missing (401)', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('No authentication token provided');
    });

    it('should reject request when token is malformed or invalid (401)', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer this.is.an.invalid.token');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid authentication token');
    });
  });

  // ============================================================================
  // LOGOUT TEST (/api/auth/logout)
  // ============================================================================
  describe('POST /api/auth/logout', () => {
    it('should return 200 OK instructing client to discard token', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: validUserData.email,
          password: validUserData.password
        });

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${loginRes.body.data.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Logout successful');
    });
  });
});
