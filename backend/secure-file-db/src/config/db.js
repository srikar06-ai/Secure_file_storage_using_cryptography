/**
 * MongoDB Database Connection Manager (Database Layer)
 * Module: secure-file-db/src/config/db.js
 * 
 * Configures connection pooling, connection timeouts, TLS support,
 * and Mongoose security settings (sanitizeFilter and strictQuery).
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// ==============================================================================
// Security Settings
// ==============================================================================
// sanitizeFilter: Rejects untrusted query selectors ($where, $ne, $regex) in user input
mongoose.set('sanitizeFilter', true);

// strictQuery: Filters out query filter properties not defined in Mongoose schemas
mongoose.set('strictQuery', true);

export const getConnectionState = () => {
  const states = {
    0: 'DISCONNECTED',
    1: 'CONNECTED',
    2: 'CONNECTING',
    3: 'DISCONNECTING'
  };
  return states[mongoose.connection.readyState] || 'UNKNOWN';
};

/**
 * Connect to MongoDB with connection pooling and security configurations
 * @param {string} [customUri] - Optional custom URI override
 * @returns {Promise<typeof mongoose>}
 */
export async function connectDB(customUri = null) {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  const uri = customUri || process.env.APP_DB_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/secure_file_storage?replicaSet=rs0';

  const options = {
    minPoolSize: parseInt(process.env.MONGO_MIN_POOL_SIZE, 10) || 5,
    maxPoolSize: parseInt(process.env.MONGO_MAX_POOL_SIZE, 10) || 50,
    serverSelectionTimeoutMS: parseInt(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS, 10) || 5000,
    socketTimeoutMS: parseInt(process.env.MONGO_SOCKET_TIMEOUT_MS, 10) || 45000,
    autoIndex: process.env.NODE_ENV !== 'production'
  };

  try {
    const conn = await mongoose.connect(uri, options);
    console.log(`🌿 [MongoDB Database Layer] Connected to: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`❌ [MongoDB Database Layer Error] Connection failed: ${error.message}`);
    throw error;
  }
}

/**
 * Disconnect cleanly from MongoDB
 */
export async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('🌿 [MongoDB Database Layer] Disconnected cleanly from database.');
  }
}

// Connection lifecycle event logging
mongoose.connection.on('connected', () => {
  console.log('🌿 [MongoDB] Active replica set connection established.');
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

export default {
  connectDB,
  disconnectDB,
  getConnectionState
};
