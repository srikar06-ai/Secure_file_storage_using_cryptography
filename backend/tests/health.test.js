/**
 * Health Check & Express Server Verification Test
 * File: tests/health.test.js
 * 
 * Verifies that the Express server initializes properly, applies security headers,
 * responds correctly to the health check endpoint, and returns 404 for unknown routes.
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');

describe('PHASE 1: Express App & Health Check Suite', () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  it('GET /api/health - should return 200 OK with system status', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('message');
    expect(response.body.data).toMatchObject({
      status: 'UP',
      version: '1.0.0'
    });
    expect(response.body.data).toHaveProperty('uptimeSeconds');
    expect(response.body.data).toHaveProperty('nodeVersion');
  });

  it('GET / - should return welcome message and health endpoint link', async () => {
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('healthCheck', '/api/health');
  });

  it('GET /api/non-existent-route - should return 404 Not Found in JSON format', async () => {
    const response = await request(app).get('/api/non-existent-route');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Resource not found');
  });

  it('Security Headers - should verify Helmet security headers are present', async () => {
    const response = await request(app).get('/api/health');

    // Helmet security headers
    expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
    expect(response.headers).toHaveProperty('x-dns-prefetch-control', 'off');
    expect(response.headers).toHaveProperty('x-download-options', 'noopen');
    expect(response.headers).toHaveProperty('x-frame-options', 'SAMEORIGIN');
  });
});
