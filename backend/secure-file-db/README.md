# SECURE FILE STORAGE SYSTEM USING CRYPTOGRAPHY – CRYPTO6 MSD
## MongoDB Database & Security Architecture Layer (`secure-file-db`)

A hardened, transactional MongoDB database layer built using **Mongoose 8.x**, **MongoDB 7.x Replica Set**, **ES Modules**, **Joi validation**, and **Vitest** for the college project: **CRYPTO6 MSD**.

---

## 1. Project Overview & Role Separation

This subproject (`secure-file-db/`) implements the complete **Database Layer** with zero-trust security principles. It is engineered to integrate cleanly with the Express.js REST API backend team without coupling routes, controllers, or plaintext file handling to database internals.

### Core Architectural Separation:
- **What this Database Layer Manages:**
  - Strict Mongoose schemas with field-level security (`select: false` on sensitive tokens, password hashes, and encryption keys).
  - Multi-document ACID transactions via MongoDB Replica Set sessions (for user registrations, uploads, deletions, and shares).
  - Append-only `AuditLog` protection (prohibiting updates, deletions, or drops).
  - Account lockout tracking (5 consecutive failed attempts -> 15-minute freeze).
  - High-performance aggregation pipelines and security audit reports.
- **What this Layer NEVER Touches:**
  - Plaintext passwords (the backend passes pre-hashed passwords).
  - Plaintext files or cryptographic key wrapping (the backend passes pre-encrypted file metadata, wrapped DEKs, IVs, and auth tags).
  - Express routes, controllers, or Multer uploads.

---

## 2. What Are MongoDB Replica Sets?

A **MongoDB Replica Set** is a cluster of `mongod` instances that maintain the exact same dataset. In production environments, replica sets provide:
1. **High Availability:** If a primary node fails, an automated election votes a secondary node to become the new primary.
2. **Redundancy & Data Fault-Tolerance:** Writes are replicated across secondary nodes.
3. **Oplog (Operations Log):** A specialized capped collection (`local.oplog.rs`) that records a rolling history of all write operations.

In development and testing, a **single-node replica set** (`rs0`) runs a single primary `mongod` instance with replica set functionality enabled (`--replSet rs0`). This activates the MongoDB **oplog**, which is the fundamental mechanism that unlocks **MongoDB Multi-Document ACID Transactions**.

---

## 3. Why Transactions Require Replica-Set Support

In MongoDB, standalone instances (single `mongod` without `--replSet`) **do not support multi-document ACID transactions**.

Transactions require a replica set because:
1. **Global Oplog Coordination:** During a transaction, writes across multiple collections (`Users`, `Files`, `FileShares`, `AuditLogs`) are staged in memory. MongoDB uses the replica set oplog to guarantee **Atomicity** and **Isolation** across all participating documents.
2. **Commit / Abort Protocol:** When `session.commitTransaction()` is invoked, all operations are atomically committed and written to the oplog with a single global cluster timestamp. If any error occurs or `session.abortTransaction()` is called, all staged changes are completely rolled back.
3. **No Partial Writes:** In our secure file storage architecture:
   - When a user uploads a file, we MUST insert the `File` metadata record AND the `UPLOAD` `AuditLog` record atomically. If the audit log fails to write, the file metadata must rollback.
   - When an account is registered, the `User` document AND the `REGISTER` `AuditLog` record must commit together.
   - When an owner deletes a file, the `File` document, all associated `FileShare` permissions, and the `DELETE` `AuditLog` must be removed/recorded within a single transaction boundary.

---

## 4. Configuration Files & Component Responsibilities

| File | Purpose |
|---|---|
| [`package.json`](file:///c:/Users/Nikhil%20Poreddy/Desktop/backend/secure-file-db/package.json) | Declares `"type": "module"` (pure ES Modules), runtime dependencies (`mongoose`, `dotenv`, `joi`), devDependencies (`vitest`, `mongodb-memory-server`), and npm scripts. |
| [`docker-compose.yml`](file:///c:/Users/Nikhil%20Poreddy/Desktop/backend/secure-file-db/docker-compose.yml) | Orchestrates MongoDB 7.x containerized service with replica set `rs0` enabled, health checks, dedicated volume persistence, and automated replica set initialization (`mongo-init`). Bound strictly to `127.0.0.1:27017` to prevent external network exposure. |
| [`.env.example`](file:///c:/Users/Nikhil%20Poreddy/Desktop/backend/secure-file-db/.env.example) | Secure template for environment variables, documenting admin connection strings (`MONGODB_URI`) and least-privilege application strings (`APP_DB_URI`). |
| [`.env`](file:///c:/Users/Nikhil%20Poreddy/Desktop/backend/secure-file-db/.env) | Local environment configuration specifying the database name (`secure_file_storage`), pool limits, and connection timeouts. |
| [`.gitignore`](file:///c:/Users/Nikhil%20Poreddy/Desktop/backend/secure-file-db/.gitignore) | Protects `.env`, `node_modules`, test coverage, logs, and database storage volumes from Git commits. |
| [`scripts/verify-replica.js`](file:///c:/Users/Nikhil%20Poreddy/Desktop/backend/secure-file-db/scripts/verify-replica.js) | Standalone verification script that inspects replica set health (`replSetGetStatus`), verifies the primary node, and executes an end-to-end multi-document ACID transaction with isolation check and commit. |
| [`tests/replica.test.js`](file:///c:/Users/Nikhil%20Poreddy/Desktop/backend/secure-file-db/tests/replica.test.js) | Automated Vitest test suite that tests replica set election, transaction isolation, successful commits, and rollbacks on failure using `mongodb-memory-server` in replica set mode. |

---

## 5. How to Start and Stop the Database

### Method A: Docker Compose (Recommended for Production & Docker Environments)
To launch MongoDB 7.x with single-node replica set `rs0`:
```bash
# Start MongoDB in the background
npm run db:up
# Or directly: docker compose up -d

# Check live logs
npm run db:logs

# Stop MongoDB
npm run db:down
```

### Method B: In-Memory Replica Set (Zero Setup / Instant Verification)
For instant verification or automated testing without Docker:
```bash
# Run standalone replica set verification script
npm run verify:replica

# Run automated Vitest test suite
npm test
```

### Method C: Local Windows MongoDB Service
If running against a native Windows MongoDB service:
1. Open `C:\Program Files\MongoDB\Server\8.x\bin\mongod.cfg`.
2. Under `replication:`, set:
   ```yaml
   replication:
     replSetName: rs0
   ```
3. Restart the MongoDB service in PowerShell as Administrator:
   ```powershell
   Restart-Service MongoDB
   ```
4. Initiate the replica set in `mongosh`:
   ```javascript
   rs.initiate({ _id: "rs0", members: [{ _id: 0, host: "127.0.0.1:27017" }] });
   ```

---

## 6. How the Express Backend Will Connect to this Database

The Express backend connects using the **least-privilege connection URI** configured in `.env`:

```env
APP_DB_URI=mongodb://app_user:appUserPassword123@127.0.0.1:27017/secure_file_storage?authSource=secure_file_storage&replicaSet=rs0
```

### Key Connection Requirements:
1. **`replicaSet=rs0` Query Parameter:** Informs Mongoose/MongoDB driver that it is communicating with replica set `rs0`. This enables driver-side transaction session routing to the primary node.
2. **`authSource=secure_file_storage`:** Directs authentication to the database where the least-privilege `app_user` resides.
3. **Mongoose Settings:**
   ```javascript
   import mongoose from 'mongoose';

   mongoose.set('sanitizeFilter', true); // Rejects untrusted query selectors ($where, $ne)
   mongoose.set('strictQuery', true);     // Strips fields not defined in schemas

   await mongoose.connect(process.env.APP_DB_URI, {
     minPoolSize: 5,
     maxPoolSize: 50,
     serverSelectionTimeoutMS: 5000
   });
   ```

---

## 7. Phase 1 Verification Results

### 1. Standalone Script (`npm run verify:replica`):
```text
======================================================
  MONGODB REPLICA SET & TRANSACTION VERIFICATION
======================================================
✅ [Success] In-Memory Replica Set 'rs0' started successfully!
   - Replica Set URI: mongodb://127.0.0.1:60841/secure_file_storage?replicaSet=rs0

[Step 2] Querying replSetGetStatus from MongoDB...
   - Replica Set Name:  rs0
   - Number of Members: 1
     * Node 0 (127.0.0.1:60841): State = PRIMARY

[Step 3] Testing Multi-Document ACID Transaction with Session...
   - Count outside active transaction (Isolation check): 0 (expected: 0)
   - Transaction committed successfully!
   - Count after commit: 2 (expected: 2)
✅ [Success] Multi-document ACID transactions are fully verified and operational!
```

### 2. Vitest Test Suite (`npm test`):
```text
 ✓ tests/replica.test.js (3 tests) 2139ms
   ✓ should successfully query replSetGetStatus and verify primary node
   ✓ should verify transaction isolation and successful commit
   ✓ should rollback all operations when a transaction is aborted

 Test Files  1 passed (1)
      Tests  3 passed (3)
```
