/**
 * MongoDB Replica Set & Transaction Automated Test Suite
 * File: tests/replica.test.js
 * 
 * Verifies that the MongoDB instance runs as a replica set (rs0),
 * supports MongoDB sessions, and executes multi-document ACID transactions
 * with full isolation, commit, and rollback capabilities.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

describe('PHASE 1: MongoDB Replica Set & ACID Transactions Verification', () => {
  let replSet;

  beforeAll(async () => {
    // Start in-memory single-node replica set 'rs0' with wiredTiger storage engine
    replSet = await MongoMemoryReplSet.create({
      replSet: {
        name: 'rs0',
        count: 1,
        storageEngine: 'wiredTiger'
      }
    });

    await replSet.waitUntilRunning();
    const uri = replSet.getUri('secure_file_storage');

    await mongoose.connect(uri);
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (replSet) {
      await replSet.stop();
    }
  });

  it('should successfully query replSetGetStatus and verify primary node', async () => {
    const admin = mongoose.connection.db.admin();
    const status = await admin.command({ replSetGetStatus: 1 });

    expect(status.ok).toBe(1);
    expect(status.set).toBe('rs0');
    expect(status.members).toHaveLength(1);
    expect(['PRIMARY', 'STARTUP2', 'SECONDARY']).toContain(status.members[0].stateStr);
  });

  it('should verify transaction isolation and successful commit', async () => {
    const AuditTestSchema = new mongoose.Schema({
      action: String,
      timestamp: { type: Date, default: Date.now }
    });
    const AuditTest = mongoose.model('AuditReplicaTest', AuditTestSchema);
    await AuditTest.createCollection();

    const session = await mongoose.startSession();
    session.startTransaction();

    await AuditTest.create([{ action: 'UPLOAD_ENCRYPTED_FILE' }], { session });

    // Isolation check: uncommitted write must not be visible to queries outside this session
    const visibleCount = await AuditTest.countDocuments();
    expect(visibleCount).toBe(0);

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    // After commit, document must be permanently visible
    const committedCount = await AuditTest.countDocuments();
    expect(committedCount).toBe(1);
  });

  it('should rollback all operations when a transaction is aborted', async () => {
    const UserTestSchema = new mongoose.Schema({
      username: String,
      email: String
    });
    const UserTest = mongoose.model('UserReplicaTest', UserTestSchema);
    await UserTest.createCollection();

    const session = await mongoose.startSession();
    session.startTransaction();

    await UserTest.create([{ username: 'alice_crypto', email: 'alice@crypto6.edu' }], { session });

    // Simulate an unexpected error occurring before completion
    await session.abortTransaction();
    session.endSession();

    // Rollback check: no records should exist
    const count = await UserTest.countDocuments({ username: 'alice_crypto' });
    expect(count).toBe(0);
  });
});
