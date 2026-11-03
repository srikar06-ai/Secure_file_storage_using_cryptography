/**
 * MongoDB Database Connection Manager
 * Module: src/config/db.js
 * 
 * Manages Mongoose connection lifecycle, connection pooling, and security hardening.
 * Applies sanitizeFilter and strictQuery to guard against NoSQL injection.
 */

const mongoose = require('mongoose');
const { MONGODB_URI, NODE_ENV } = require('./env');

// ==============================================================================
// Security Settings
// ==============================================================================
// sanitizeFilter: Automatically escapes query selectors containing $ or dots in user input
// preventing NoSQL injection attempts ($ne, $gt, $where).
mongoose.set('sanitizeFilter', true);

// strictQuery: Filters out query filter properties that are not defined in the Mongoose schema,
// preventing parameter pollution and hidden field enumeration.
mongoose.set('strictQuery', true);

// In test environment, disable background auto-indexing to avoid open handles in disconnected tests
if (NODE_ENV === 'test') {
  mongoose.set('autoIndex', false);
}

// Connection state helper
const getConnectionState = () => {
  const states = {
    0: 'DISCONNECTED',
    1: 'CONNECTED',
    2: 'CONNECTING',
    3: 'DISCONNECTING'
  };
  return states[mongoose.connection.readyState] || 'UNKNOWN';
};

/**
 * Connect to MongoDB with connection pooling and retry handling
 * @param {string} [uri] - Optional MongoDB URI override (e.g. for testing)
 * @returns {Promise<typeof mongoose>}
 */
async function connectDB(uri = MONGODB_URI) {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  const options = {
    minPoolSize: 5,
    maxPoolSize: 50,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    autoIndex: NODE_ENV !== 'production' // Avoid index building overhead in production
  };

  try {
    const conn = await mongoose.connect(uri, options);
    console.log(`🌿 [MongoDB] Connected successfully to: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`❌ [MongoDB Error] Connection failed: ${error.message}`);
    if (NODE_ENV !== 'test') {
      console.warn('⚠️ [MongoDB] Server continuing in degraded mode. Reconnection attempts will continue in background.');
    }
    throw error;
  }
}

/**
 * Disconnect cleanly from MongoDB (used during graceful shutdown and tests)
 */
async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('🌿 [MongoDB] Disconnected cleanly from database.');
  }
}

// ==============================================================================
// Connection Event Listeners
// ==============================================================================
mongoose.connection.on('connected', () => {
  console.log('🌿 [MongoDB] Active connection established.');
});

mongoose.connection.on('error', (err) => {
  console.error('🚨 [MongoDB Error] Connection error occurred:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ [MongoDB Warning] Disconnected from database.');
});

mongoose.connection.on('reconnected', () => {
  console.log('🌿 [MongoDB] Successfully reconnected to database.');
});

module.exports = {
  connectDB,
  disconnectDB,
  getConnectionState
};
