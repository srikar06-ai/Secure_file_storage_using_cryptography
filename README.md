# Secure File Storage Using Cryptography (CRYPTO6 MSD)

An integrated, enterprise-grade file security application employing **AES-256-GCM Envelope Encryption**, **SHA-256 cryptographic verification**, and a zero-trust full-stack architecture.

---

## 🔒 System Architecture

```
                  ┌──────────────────────────────────────────────┐
                  │          SecureVault Web Frontend             │
                  │   HTML5, CSS3, ES6+ Modular Components       │
                  │   (Preview & UI Server: http://localhost:3000)│
                  └───────────────────────┬──────────────────────┘
                                          │
                                          │ REST API & JSON / JWT
                                          │ CORS Enabled
                                          ▼
                  ┌──────────────────────────────────────────────┐
                  │          Express.js Security Backend         │
                  │   Envelope Encryption Engine (AES-256-GCM)   │
                  │   Master Key (KEK) + Data Encryption Keys    │
                  │   (API Server: http://localhost:5000)        │
                  └───────────────────────┬──────────────────────┘
                                          │
                        ┌─────────────────┴─────────────────┐
                        │                                   │
                        ▼                                   ▼
          ┌───────────────────────────┐       ┌───────────────────────────┐
          │     Encrypted Storage     │       │     MongoDB Database      │
          │  Zero-Knowledge Payloads  │       │   Transactional Metadata, │
          │  Wrapped DEKs & IVs       │       │   Append-Only Audit Logs  │
          └───────────────────────────┘       └───────────────────────────┘
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18.x or v20+ installed.
- **MongoDB** (Optional for local persistent database): MongoDB 6.x or 7.x running on port `27017`.

---

### Step 1: Install Dependencies
```bash
# Install backend dependencies
cd backend
npm install
cd ..
```

---

### Step 2: Configure Environment
Copy `.env.example` in `backend/` to `backend/.env` (pre-configured defaults are provided for local development):
```bash
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000
MONGODB_URI=mongodb://127.0.0.1:27017/secure_file_storage_crypto6
JWT_SECRET=crypto6_msd_secure_jwt_token_secret_key_college_major_project_2026_production_ready
MASTER_KEY=ad70276d4dcac59261458db7e82a26db32e36bdf04cbfadc75205e88d801eaaa
STORAGE_PATH=./storage/encrypted
```

---

### Step 3: Run the Application

You can start both frontend and backend independently or together:

#### Option A: Start Frontend Web Application
```bash
node frontend/serve.js
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

#### Option B: Start Backend API Server
```bash
node backend/server.js
```
The REST API will boot on **[http://localhost:5000](http://localhost:5000)**.
- Health Check: `http://localhost:5000/api/health`

---

## 🧪 Testing Cryptographic Suite

To run the automated cryptographic verification and envelope encryption test suite:
```bash
cd backend
npx jest tests/crypto.test.js
```

### Verified Cryptographic Capabilities
- [x] AES-256 Galois/Counter Mode (GCM) symmetric file encryption & decryption.
- [x] Unique 96-bit Initialization Vector (Nonce) generated per file (preventing replay and pattern attacks).
- [x] Envelope Encryption: 256-bit Data Encryption Key (DEK) wrapped with Master Key (KEK).
- [x] SHA-256 cryptographic digest calculation ensuring bit-perfect tamper detection.
- [x] Authentication tag verification preventing ciphertext tampering.

---

## 📁 Repository Structure

```
.
├── .gitignore                    # Root Git ignore rules (protects credentials and node_modules)
├── package.json                  # Top-level workspace script runner
├── README.md                     # Integrated project documentation
│
├── frontend/                     # SecureVault User Interface
│   ├── index.html                # Vault Home & Security Showcase
│   ├── login.html                # User authentication & token management
│   ├── signup.html               # Account provisioning
│   ├── dashboard.html            # Main storage overview and statistics
│   ├── upload.html               # File securing & envelope encryption pipeline
│   ├── decrypt.html              # Decryption and file recovery module
│   ├── my-files.html             # Encrypted file inventory & management
│   ├── shared-files.html         # Revocable file share access
│   ├── activity-logs.html        # Security audit log explorer
│   ├── key-management.html       # Master key & DEK lifecycle manager
│   ├── profile.html              # User security settings
│   ├── serve.js                  # Static preview server (port 3000)
│   ├── css/                      # Responsive modern CSS stylesheets
│   ├── js/                       # Frontend application logic
│   │   ├── api.js                # Centralized REST API client & JWT bridge
│   │   ├── app.js                # UI controls, modals, toasts
│   │   ├── auth.js               # Login & signup handlers
│   │   ├── encryption.js         # File upload & cryptographic pipeline
│   │   └── storage.js            # Unified state management & mock store
│   └── assets/                   # SVG icons and visual assets
│
└── backend/                      # Express REST API & Cryptography Engine
    ├── app.js                    # Express app configuration & middleware
    ├── server.js                 # HTTP server entry point & shutdown hooks
    ├── package.json              # Backend dependencies
    ├── src/
    │   ├── config/               # Database and environment configurations
    │   ├── controllers/          # Route controllers (Auth, File, Share, Audit, User)
    │   ├── middleware/           # Auth, role, rate-limiting, and Multer upload guards
    │   ├── models/               # Mongoose schemas (User, File, Share, AuditLog)
    │   ├── routes/               # API route definitions
    │   ├── services/             # Core cryptoService, fileService, auditService
    │   └── utils/                # Token and response utility helpers
    └── tests/                    # Jest cryptographic & API integration tests
```

---

## 🌐 Opening the Project in Browser

Launch the frontend server:
```bash
node frontend/serve.js
```
Then navigate to:
👉 **`http://localhost:3000`** (or **`http://localhost:3000/login.html`**)
