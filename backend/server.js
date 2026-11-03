/**
 * Server Entry Point
 * File: server.js
 * 
 * Boots the HTTP server, ensures storage directories exist,
 * and sets up process lifecycle and termination listeners.
 */

const fs = require('fs');
const path = require('path');
const app = require('./app');
const { PORT, NODE_ENV, STORAGE_PATH } = require('./src/config/env');
const { connectDB, disconnectDB } = require('./src/config/db');

// Ensure encrypted file storage directory exists
try {
  if (!fs.existsSync(STORAGE_PATH)) {
    fs.mkdirSync(STORAGE_PATH, { recursive: true });
    console.log(`📁 [Storage] Created encrypted file storage directory at: ${STORAGE_PATH}`);
  }
} catch (err) {
  console.error('❌ [Storage Error] Failed to initialize storage directory:', err);
  process.exit(1);
}

// Connect to MongoDB then start HTTP server
let server;
async function startServer() {
  try {
    await connectDB();
  } catch (err) {
    console.warn('⚠️ [MongoDB] Starting server without initial DB connection (will retry)...');
  }

  server = app.listen(PORT, () => {
    console.log(`
======================================================================
  SECURE FILE STORAGE USING CRYPTOGRAPHY - CRYPTO6 MSD
  Architecture: Envelope Encryption (AES-256-GCM + SHA-256)
======================================================================
  🚀 Status:        Server is actively running
  🌐 Port:          ${PORT}
  🛠️  Environment:   ${NODE_ENV}
  🩺 Health Check:  http://localhost:${PORT}/api/health
  📁 Storage Path:  ${STORAGE_PATH}
======================================================================
    `);
  });
}

startServer();

// ==============================================================================
// Graceful Shutdown & Process Monitoring
// ==============================================================================
async function gracefulShutdown(signal) {
  console.log(`\n🛑 [Shutdown] Received ${signal}. Closing HTTP server gracefully...`);
  if (server) {
    server.close(async () => {
      console.log('✅ [Shutdown] HTTP server closed cleanly.');
      await disconnectDB();
      console.log('✅ [Shutdown] Database disconnected. Exiting process.');
      process.exit(0);
    });
  } else {
    await disconnectDB();
    process.exit(0);
  }

  // Force close if server takes too long to shut down
  setTimeout(() => {
    console.error('⚠️ [Shutdown] Forced shutdown: connections timed out.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 [Unhandled Rejection] Promise:', promise, 'Reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('🚨 [Uncaught Exception] Fatal error occurred:', error);
  process.exit(1);
});

module.exports = server;
