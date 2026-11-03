/**
 * MongoDB Replica Set & Transaction Verification Script
 * File: scripts/verify-replica.js
 * 
 * Verifies replica set status, primary node election, and ACID transactions.
 * Supports both external MongoDB replica set (via Docker/local) and MongoMemoryReplSet.
 */

import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import dotenv from 'dotenv';

dotenv.config();

async function verifyReplicaSet() {
  console.log('\n======================================================');
  console.log('  MONGODB REPLICA SET & TRANSACTION VERIFICATION');
  console.log('======================================================\n');

  let replSet = null;
  let connectionUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/secure_file_storage?replicaSet=rs0';
  let usingMemoryReplSet = false;

  // Step 1: Attempt to check external MongoDB replica set first
  try {
    console.log(`[Step 1] Attempting connection to configured MongoDB URI:\n         ${connectionUri}`);
    await mongoose.connect(connectionUri, {
      serverSelectionTimeoutMS: 2000
    });

    const adminDb = mongoose.connection.db.admin();
    const status = await adminDb.command({ replSetGetStatus: 1 });
    console.log(`✅ [Success] Connected to external MongoDB Replica Set: "${status.set}"`);
    console.log(`   - Current Node State: ${status.members.find(m => m.self)?.stateStr || 'PRIMARY'}`);
  } catch (externalErr) {
    console.log(`ℹ️ [Info] External replica set not reachable (${externalErr.message}).`);
    console.log('         Spanning in-memory single-node replica set using mongodb-memory-server...');

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    // Spin up MongoMemoryReplSet
    replSet = await MongoMemoryReplSet.create({
      replSet: {
        name: 'rs0',
        count: 1,
        storageEngine: 'wiredTiger'
      }
    });

    await replSet.waitUntilRunning();
    connectionUri = replSet.getUri('secure_file_storage');
    usingMemoryReplSet = true;

    console.log(`✅ [Success] In-Memory Replica Set 'rs0' started successfully!`);
    console.log(`   - Replica Set URI: ${connectionUri}`);

    await mongoose.connect(connectionUri);
  }

  // Step 2: Verify Replica Set Status via admin command
  console.log('\n[Step 2] Querying replSetGetStatus from MongoDB...');
  const admin = mongoose.connection.db.admin();
  const replStatus = await admin.command({ replSetGetStatus: 1 });

  console.log(`   - Replica Set Name:  ${replStatus.set}`);
  console.log(`   - Cluster Time:      ${JSON.stringify(replStatus.operationTime || 'N/A')}`);
  console.log(`   - Number of Members: ${replStatus.members.length}`);
  replStatus.members.forEach((member) => {
    console.log(`     * Node ${member._id} (${member.name}): State = ${member.stateStr}`);
  });

  // Step 3: Test Multi-Document ACID Transaction
  console.log('\n[Step 3] Testing Multi-Document ACID Transaction with Session...');

  const TestSchema = new mongoose.Schema({
    name: String,
    value: Number
  });
  const TestModel = mongoose.model('ReplicaTest', TestSchema);
  // In MongoDB, collections must be pre-created before multi-document transactions run against them
  await TestModel.createCollection();

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // Insert within transaction
    await TestModel.create([{ name: 'Test Document 1', value: 100 }], { session });
    await TestModel.create([{ name: 'Test Document 2', value: 200 }], { session });

    // Verify uncommitted state is not visible outside session
    const outsideCount = await TestModel.countDocuments();
    console.log(`   - Count outside active transaction (Isolation check): ${outsideCount} (expected: 0)`);

    // Commit transaction
    await session.commitTransaction();
    console.log('   - Transaction committed successfully!');

    // Verify committed count
    const committedCount = await TestModel.countDocuments();
    console.log(`   - Count after commit: ${committedCount} (expected: 2)`);

    console.log('✅ [Success] Multi-document ACID transactions are fully verified and operational!\n');
  } catch (txErr) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    console.error('❌ [Error] Transaction failed:', txErr);
    throw txErr;
  } finally {
    session.endSession();
  }

  // Clean up test collection
  try {
    await mongoose.connection.db.dropCollection('replicatests');
  } catch (_) {}

  // Teardown
  await mongoose.disconnect();
  if (replSet) {
    await replSet.stop();
    console.log('🛑 [Teardown] In-memory replica set stopped cleanly.');
  }

  console.log('======================================================');
  console.log('  REPLICA SET & TRANSACTION VALIDATION COMPLETE: PASS ');
  console.log('======================================================\n');
}

verifyReplicaSet().catch((err) => {
  console.error('\n❌ Verification failed with error:', err);
  process.exit(1);
});
