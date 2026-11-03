/**
 * Express Application Configuration
 * File: app.js
 * 
 * Configures Express middlewares, security policies, routes, and error handlers.
 * Separated from server.js to facilitate isolated integration testing with Supertest.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { CLIENT_URL, NODE_ENV } = require('./src/config/env');
const { apiLimiter } = require('./src/middleware/rateLimitMiddleware');
const { notFoundHandler, errorHandler } = require('./src/middleware/errorMiddleware');
const { sendSuccess } = require('./src/utils/responseUtils');

const app = express();

// ==============================================================================
// 1. HTTP Security Headers (Helmet)
// ==============================================================================
app.use(
  helmet({
    contentSecurityPolicy: NODE_ENV === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false
  })
);

// ==============================================================================
// 2. Cross-Origin Resource Sharing (CORS)
// ==============================================================================
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin || origin === CLIENT_URL || NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Cross-Origin Request Blocked by Security Policy.'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));

// ==============================================================================
// 3. Body Parsing Middlewares
// ==============================================================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==============================================================================
// 4. Request Logging (Morgan)
// ==============================================================================
if (NODE_ENV !== 'test') {
  app.use(morgan(NODE_ENV === 'development' ? 'dev' : 'combined'));
}

// ==============================================================================
// 5. Global API Rate Limiting
// ==============================================================================
app.use('/api', apiLimiter);

// ==============================================================================
// 6. Base & Health Check Route
// ==============================================================================
const { getConnectionState } = require('./src/config/db');

app.get('/api/health', (req, res) => {
  return sendSuccess(res, 'Secure File Storage API (CRYPTO6 MSD) is operational.', {
    status: 'UP',
    database: getConnectionState(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: NODE_ENV,
    version: '1.0.0',
    nodeVersion: process.version,
    timestamp: new Date().toISOString()
  });
});

// Root welcome message
app.get('/', (req, res) => {
  return sendSuccess(res, 'Welcome to Secure File Storage System API (CRYPTO6 MSD).', {
    healthCheck: '/api/health',
    documentation: 'See README.md for complete REST API specifications.'
  });
});

// ==============================================================================
// 7. Route Handlers
// ==============================================================================
const authRoutes = require('./src/routes/authRoutes');
const fileRoutes = require('./src/routes/fileRoutes');
const shareRoutes = require('./src/routes/shareRoutes');
const auditRoutes = require('./src/routes/auditRoutes');
const userRoutes = require('./src/routes/userRoutes');

// ── Authentication ─────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);

// ── File Management (Upload, Download, List, Delete, Admin Purge) ──────────────
app.use('/api/files', fileRoutes);

// ── Secure File Sharing (Create, List, Verify Token, Revoke) ──────────────────
app.use('/api/shares', shareRoutes);

// ── Security Audit Logs (Self-service, File-level, Admin System-wide) ─────────
app.use('/api/audit', auditRoutes);

// ── User Management (Profile, Password Change, Admin CRUD) ────────────────────
app.use('/api/users', userRoutes);

// ==============================================================================
// 8. 404 Not Found & Centralized Error Handlers
// ==============================================================================
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
