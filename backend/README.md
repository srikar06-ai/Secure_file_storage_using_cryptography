# SECURE FILE STORAGE USING CRYPTOGRAPHY – CRYPTO6 MSD

A zero-knowledge inspired, high-security file storage backend service implementing **Envelope Encryption (AES-256-GCM)**, **SHA-256 integrity verification**, **Role-Based Access Control (RBAC)**, and **cryptographically secure time-limited file sharing**.

---

## 1. Project Overview & Objectives

In modern cloud environments, storing sensitive files in plaintext or relying on storage-layer encryption alone leaves data vulnerable to insider threats, database exfiltration, and unauthorized access.

**CRYPTO6 MSD** solves this by implementing application-level **Envelope Encryption**:
1. **Per-File Data Encryption Key (DEK):** Every uploaded file is encrypted on-the-fly using a unique, cryptographically random 256-bit key with AES-256-GCM.
2. **Key Encryption Key (KEK):** The DEK is never stored in plaintext. It is wrapped (encrypted) with a separate master key (KEK) before metadata is saved to MongoDB.
3. **Integrity & Authenticity:** AES-256-GCM provides authenticated encryption with an authentication tag (`authTag`). Any modification or bit-flipping of ciphertext causes decryption to fail. In addition, an unencrypted SHA-256 checksum is computed on the original plaintext file to enable end-to-end data integrity validation.
4. **Zero-Leakage Authorization:** Users cannot view or download files without ownership or active, non-revoked sharing permissions.

---

## 2. Technology Stack

- **Runtime & Framework:** Node.js (v20+), Express.js (v4/v5)
- **Database & ODM:** MongoDB, Mongoose
- **Cryptography:** Node.js native `crypto` module (AES-256-GCM, SHA-256, secure random nonces)
- **Authentication & Security:** JWT (`jsonwebtoken`), `bcryptjs`, `helmet`, `cors`, `express-rate-limit`
- **File Ingestion:** `multer` (in-memory streaming buffer to encrypted storage)
- **Validation:** `joi`
- **Testing:** `jest`, `supertest`

---

## 3. Directory Architecture

```
backend/
├── src/
│   ├── config/
│   │   ├── db.js                   # MongoDB connection lifecycle (Phase 2)
│   │   └── env.js                  # Environment configuration and validation
│   ├── controllers/
│   │   ├── authController.js       # User registration, login, profile (Phase 3)
│   │   ├── fileController.js       # Upload, metadata, download, delete (Phase 5-7)
│   │   ├── shareController.js      # Sharing tokens, expiration, revocation (Phase 9)
│   │   ├── auditController.js      # Security event logs (Phase 10)
│   │   └── userController.js       # User profile and admin operations (Phase 8)
│   ├── middleware/
│   │   ├── authMiddleware.js       # JWT extraction & authentication
│   │   ├── errorMiddleware.js      # 404 & Centralized error handler
│   │   ├── rateLimitMiddleware.js  # Global & Auth rate limiters
│   │   ├── roleMiddleware.js       # Role-Based Access Control (RBAC)
│   │   ├── uploadMiddleware.js     # Multer file size/type restrictions
│   │   └── validationMiddleware.js # Joi schema validation
│   ├── models/
│   │   ├── User.js                 # User schema & credentials
│   │   ├── File.js                 # Encrypted file metadata & wrapped DEK
│   │   ├── Share.js                # Secure access tokens & permissions
│   │   └── AuditLog.js             # Security audit logs
│   ├── routes/
│   │   ├── authRoutes.js           # /api/auth
│   │   ├── fileRoutes.js           # /api/files
│   │   ├── shareRoutes.js          # /api/shares
│   │   ├── auditRoutes.js          # /api/audit
│   │   └── userRoutes.js           # /api/users
│   ├── services/
│   │   ├── authService.js          # Authentication business logic
│   │   ├── fileService.js          # File storage & decryption streaming
│   │   ├── cryptoService.js        # AES-256-GCM & DEK wrapping engine
│   │   ├── shareService.js         # Token generation & verification
│   │   └── auditService.js         # Security audit logging
│   ├── utils/
│   │   ├── fileUtils.js            # Path traversal guards & disk helpers
│   │   ├── responseUtils.js        # Standardized API response wrappers
│   │   └── tokenUtils.js           # JWT & random token generators
│   └── validators/
│       ├── authValidator.js        # Registration & login schemas
│       ├── fileValidator.js        # Upload & file metadata schemas
│       └── shareValidator.js       # File sharing schemas
├── storage/
│   └── encrypted/                  # AES-256-GCM encrypted ciphertext storage
├── tests/
│   ├── health.test.js              # Server health & security headers test
│   ├── auth.test.js                # Auth integration tests (Phase 3)
│   ├── crypto.test.js              # Cryptography unit tests (Phase 4)
│   ├── file.test.js                # Upload/download tests (Phase 5-6)
│   ├── share.test.js               # Sharing tests (Phase 9)
│   └── security.test.js           # IDOR & penetration tests (Phase 11-12)
├── app.js                          # Express application configuration
├── server.js                       # Server entry point & graceful shutdown
├── .env                            # Local environment variables
├── .env.example                    # Template environment configuration
├── .gitignore                      # Git exclusion rules
└── package.json                    # Dependencies and scripts
```

---

## 4. Environment Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

### Required Configuration Variables:

| Variable | Description | Example / Default |
|---|---|---|
| `PORT` | HTTP Server port | `5000` |
| `NODE_ENV` | Environment mode (`development`, `production`, `test`) | `development` |
| `CLIENT_URL` | Allowed frontend origin for CORS | `http://localhost:3000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/secure_file_storage_crypto6` |
| `JWT_SECRET` | Secret key for signing JSON Web Tokens | Minimum 32-character high-entropy string |
| `JWT_EXPIRES_IN` | Validity duration of access tokens | `7d` |
| `MASTER_KEY` | 256-bit Hexadecimal Key Encryption Key (KEK) | 64-character hexadecimal string |
| `STORAGE_PATH` | Path where encrypted files are written | `./storage/encrypted` |
| `MAX_FILE_SIZE_BYTES`| Maximum permitted upload size | `52428800` (50MB) |
| `RATE_LIMIT_WINDOW_MS`| Rate limiting evaluation window | `900000` (15 mins) |
| `RATE_LIMIT_MAX_REQUESTS`| Maximum requests per window | `100` |

### How to Generate a Secure 256-Bit Master Key:
Run the following Node.js command in your terminal:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Paste the 64-character output into your `.env` as `MASTER_KEY`.

---

## 5. Running the Backend

### Installation:
```bash
npm install
```

### Start in Production Mode:
```bash
npm start
```

### Start in Development Mode (with hot-reload):
```bash
npm run dev
```

### Run Automated Tests:
```bash
npm test
```

---

## 6. Phase 1 Verification: Health Check API

### Endpoint:
`GET /api/health`

### Request Example (cURL / Postman):
```http
GET http://localhost:5000/api/health
```

### Successful Response (`200 OK`):
```json
{
  "success": true,
  "message": "Secure File Storage API (CRYPTO6 MSD) is operational.",
  "timestamp": "2026-10-31T03:45:00.000Z",
  "data": {
    "status": "UP",
    "database": "CONNECTED",
    "uptimeSeconds": 15,
    "environment": "development",
    "version": "1.0.0",
    "nodeVersion": "v24.20.0",
    "timestamp": "2026-10-31T03:45:00.000Z"
  }
}
```

---

## 7. Database Schemas & Security Features (Phase 2)

### 1. User (`src/models/User.js`)
- Fields: `username` (unique), `email` (unique, validated), `passwordHash` (`select: false`), `role` (`user`/`admin`), `status`, `failedLogins`, `lockedUntil`.
- **Security Features:**
  - Password hashes are hidden from queries by default and excluded from JSON responses.
  - Account lockout triggers automatically after 5 consecutive failed login attempts (15-minute lockout).

### 2. File (`src/models/File.js`)
- Fields: `owner`, `originalName`, `storedIdentifier` (random UUID on disk), `size`, `mimeType`, `sha256` (64 hex characters), `crypto` subdocument (`algorithm: AES-256-GCM`, `iv` [12 bytes], `authTag` [16 bytes, `select: false`], `wrappedKey` [Buffer, `select: false`]), `isDeleted`, `deletedAt`.
- **Security Features:**
  - Validates 12-byte IV/nonce and 16-byte GCM authentication tag.
  - Hides sensitive wrapped key and authentication tag by default.
  - Soft-delete support (`softDelete()`, `restore()`).

### 3. Share (`src/models/Share.js`)
- Fields: `file`, `owner`, `sharedWith`, `shareTokenHash` (`select: false`), `permission` (`read`/`download`/`write`), `wrappedKey` (`select: false`), `expiresAt` (TTL index), `revokedAt`.
- **Security Features:**
  - Fast TTL-indexed expiration + programmatic expiration & revocation checks (`isValid()`).
  - Stores only hashed share tokens, never plaintext links.

### 4. AuditLog (`src/models/AuditLog.js`)
- Fields: `user`, `file`, `action`, `ipAddress`, `userAgent`, `status`, `details`, `createdAt`.
- **Security Features:**
  - **Append-only:** Strict Mongoose schema middleware intercepts and throws errors on any `updateOne`, `updateMany`, `findOneAndUpdate`, `deleteOne`, `deleteMany`, or `findOneAndDelete` calls.

---

## 8. Authentication System (Phase 3)

### Endpoints:
- `POST /api/auth/register` - Registers new user, hashes password with bcrypt (12 salt rounds), issues JWT, records `REGISTER` audit log.
- `POST /api/auth/login` - Authenticates user credentials, enforces 5-attempt account lockout (15 min freeze), issues JWT, records `LOGIN`/`LOGIN_FAILED` audit log.
- `POST /api/auth/logout` - Client-side session termination instruction.
- `GET /api/auth/me` - Protected profile endpoint requiring valid Bearer JWT.

### Password Security & Lockout Policy:
- Minimum 8 characters, maximum 72 characters, requiring uppercase, lowercase, number, and special character.
- 5 consecutive failed login attempts trigger an automated 15-minute account freeze (`lockedUntil`).
- Any login attempt during active lockout returns `423 Locked`.
- Successful authentication resets the failed login counter to 0.

---

## 9. Cryptography Engine & Key Management (Phase 4)

### Cryptographic Standards:
- **Symmetric Cipher:** AES-256-GCM (Galois/Counter Mode) authenticated encryption.
- **Key Length:** 256 bits (32 bytes cryptographically secure random).
- **Nonce / IV:** 96 bits (12 bytes) uniquely generated per encryption operation.
- **Authentication Tag:** 128 bits (16 bytes) verifying ciphertext authenticity.
- **Key Management:** Envelope Encryption protecting individual Data Encryption Keys (DEKs) using a master Key Encryption Key (KEK).
- **Integrity Verification:** Pre-encryption SHA-256 checksums verifying byte-level fidelity.

### Authenticated Encryption vs. SHA-256:
- **AES-256-GCM (Ciphertext Integrity):** Detects tampering *during* decryption. If even 1 bit of the ciphertext is flipped, decryption fails immediately and throws an error before corrupted bytes can reach memory.
- **SHA-256 (Plaintext File Integrity):** Verifies the original plaintext file before encryption and after decryption, guaranteeing zero bit-rot or payload corruption end-to-end.

### Cloud KMS Migration Architecture:
- `wrapKey(dek)` and `unwrapKey(wrappedKey)` in `src/services/cryptoService.js` are decoupled from server code.
- In production, these methods can swap local master key wrapping with AWS KMS (`kms.encrypt`/`kms.decrypt`), Azure Key Vault, or Google Cloud KMS without altering file encryption pipelines.

---

## 10. Secure File Upload & Storage (Phase 5)

### Upload Endpoint:
- `POST /api/files/upload` - Authenticated endpoint for streaming, encrypting, and storing files.

### Security Pipeline:
1. **In-Memory Streaming:** Multer uses `memoryStorage()`. Plaintext file buffers are kept strictly in ephemeral RAM and encrypted on-the-fly. **Plaintext files never touch the server disk.**
2. **Extension & MIME Filtering:** Prohibits dangerous executables and web shells (`.exe`, `.bat`, `.cmd`, `.sh`, `.php`, `.vbs`, etc.).
3. **Randomized Identifiers:** Files are stored on disk with cryptographically random UUIDs (`[uuid].enc`). The user's original filename is never used on the filesystem.
4. **Path Traversal Shield:** [`src/utils/fileUtils.js`](file:///c:/Users/Nikhil%20Poreddy/Desktop/backend/src/utils/fileUtils.js) validates all disk operations to prevent directory traversal (`../`).
5. **Orphan Cleanup Hook:** If MongoDB document insertion fails after the encrypted file is written to disk, an automated rollback immediately unlinks the orphaned ciphertext file.
6. **Audit Trail:** An `UPLOAD` audit log record is appended to the `auditlogs` collection on every upload.

---

## 11. Implementation Roadmap

- [x] **PHASE 1:** Project initialization, Express architecture, environment validation & health check.
- [x] **PHASE 2:** MongoDB connection & Mongoose schemas (User, File, Share, AuditLog).
- [x] **PHASE 3:** Authentication (Register, Login, JWT, Argon2/Bcrypt, Auth middleware).
- [x] **PHASE 4:** Cryptography engine (AES-256-GCM, Envelope Encryption, DEK wrapping, unit tests).
- [x] **PHASE 5:** Secure file upload with on-the-fly encryption & disk persistence.
- [ ] **PHASE 6:** Authorized file download with DEK unwrapping & decryption.
- [ ] **PHASE 7:** File management (list, metadata, soft/permanent delete).
- [ ] **PHASE 8:** Role-Based Access Control (RBAC) & Ownership guards.
- [ ] **PHASE 9:** Secure file sharing (tokens, expiration, permissions, revocation).
- [ ] **PHASE 10:** SHA-256 integrity verification & security audit logging.
- [ ] **PHASE 11:** Security hardening (NoSQL injection, path traversal, rate limiting).
- [ ] **PHASE 12:** End-to-end integration testing, threat modeling, and college project documentation.
