/**
 * SECUREVAULT - Central Storage & State Management
 * Persistent localStorage data store with realistic mock dataset
 */

const STORAGE_KEYS = {
  FILES: 'sv_files_v1',
  KEYS: 'sv_keys_v1',
  SHARED: 'sv_shared_v1',
  LOGS: 'sv_logs_v1',
  USER: 'sv_user_v1',
  SETTINGS: 'sv_settings_v1',
  AUTH: 'sv_auth_session_v1'
};

// Initial realistic dataset
const INITIAL_FILES = [
  {
    id: 'f-101',
    name: 'Annual_Financial_Audit_2024.pdf',
    type: 'pdf',
    sizeBytes: 4404019, // ~4.2 MB
    sizeStr: '4.2 MB',
    date: '2024-10-28',
    status: 'Secured',
    algorithm: 'AES-256',
    keyId: 'k-201',
    sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    md5: '7d8a9c2b3f1e4a5d6e7f8a9b0c1d2e3f',
    cipherPreview: 'U2FsdGVkX1+vupppZksvRf5pq5g5XwbDu2jIF9n9mI/h4m7iVd0aEw3s5T6u...',
    accessibleSample: 'SECURE FINANCIAL REPORT 2024 - Confidential Net Revenue: $4,850,000. Total Assets: $18,400,000. Audit Status: Verified by KPMG.',
    decryptedSample: 'SECURE FINANCIAL REPORT 2024 - Confidential Net Revenue: $4,850,000. Total Assets: $18,400,000. Audit Status: Verified by KPMG.'
  },
  {
    id: 'f-102',
    name: 'Executive_Board_Deck_Q3.pptx',
    type: 'doc',
    sizeBytes: 13421772, // ~12.8 MB
    sizeStr: '12.8 MB',
    date: '2024-10-27',
    status: 'Secured',
    algorithm: 'AES-256',
    keyId: 'k-201',
    sha256: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    md5: '4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d',
    cipherPreview: 'k9+FvB7/0z98mPqQw23LnVbTr4k91Z+a88vT/01MnBg7732LksP94nmK...',
    accessibleSample: 'BOARD OF DIRECTORS PRESENTATION - Q3 FY24 Strategy, Cryptographic Roadmap and Enterprise Expansion Milestones.',
    decryptedSample: 'BOARD OF DIRECTORS PRESENTATION - Q3 FY24 Strategy, Cryptographic Roadmap and Enterprise Expansion Milestones.'
  },
  {
    id: 'f-103',
    name: 'Customer_Database_Backup.sql',
    type: 'archive',
    sizeBytes: 50855936, // ~48.5 MB
    sizeStr: '48.5 MB',
    date: '2024-10-25',
    status: 'Secured',
    algorithm: 'AES-128',
    keyId: 'k-203',
    sha256: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
    md5: '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d',
    cipherPreview: '883jKd9/x11NmZ+98KaLs123498KlMopqWvBz72941LkPqo2984kLmZa...',
    accessibleSample: 'DUMP OF CUSTOMER DATABASE -- PostgreSQL 15.2. Secured customer profiles: 42,890 records.',
    decryptedSample: 'DUMP OF CUSTOMER DATABASE -- PostgreSQL 15.2. Secured customer profiles: 42,890 records.'
  },
  {
    id: 'f-104',
    name: 'Product_Roadmap_2025.docx',
    type: 'doc',
    sizeBytes: 1468006, // ~1.4 MB
    sizeStr: '1.4 MB',
    date: '2024-10-24',
    status: 'Accessible',
    algorithm: 'AES-256',
    keyId: 'k-201',
    sha256: 'ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d',
    md5: '3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f',
    cipherPreview: 'Made accessible in current session. Original payload accessible.',
    accessibleSample: 'SECUREVAULT 2025 PRODUCT ROADMAP: Zero-knowledge proofs, hardware security module (HSM) integration, post-quantum cryptography resistance.',
    decryptedSample: 'SECUREVAULT 2025 PRODUCT ROADMAP: Zero-knowledge proofs, hardware security module (HSM) integration, post-quantum cryptography resistance.'
  },
  {
    id: 'f-105',
    name: 'Employee_Salary_Records.xlsx',
    type: 'sheet',
    sizeBytes: 2202009, // ~2.1 MB
    sizeStr: '2.1 MB',
    date: '2024-10-22',
    status: 'Secured',
    algorithm: 'AES-256',
    keyId: 'k-201',
    sha256: '18ac3e7343f016890c510e93f935261169d9e3f565436429830faf0934f4f8e4',
    md5: '9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c',
    cipherPreview: 'k382mPlq+Vn82BvxW91/4kLqP0912mN84v1xX7qPla9834nmM291/0kL...',
    accessibleSample: 'PAYROLL OCTOBER 2024 - 148 employees processed. Total gross disbursement: $1,280,450.00',
    decryptedSample: 'PAYROLL OCTOBER 2024 - 148 employees processed. Total gross disbursement: $1,280,450.00'
  },
  {
    id: 'f-106',
    name: 'Security_Architecture_Diagram.png',
    type: 'image',
    sizeBytes: 3984588, // ~3.8 MB
    sizeStr: '3.8 MB',
    date: '2024-10-20',
    status: 'Secured',
    algorithm: 'RSA-2048',
    keyId: 'k-202',
    sha256: '6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b',
    md5: '2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f',
    cipherPreview: 'B98vKa1093MmXzpL7381NmV+k90123LaPqB7293/01LkM9420nmQ...',
    accessibleSample: 'PNG IMAGE STREAM [Width: 2400px, Height: 1600px] High-resolution Zero-Knowledge Architecture Topology.',
    decryptedSample: 'PNG IMAGE STREAM [Width: 2400px, Height: 1600px] High-resolution Zero-Knowledge Architecture Topology.'
  },
  {
    id: 'f-107',
    name: 'Legal_Service_Agreement_v4.pdf',
    type: 'pdf',
    sizeBytes: 870400, // ~850 KB
    sizeStr: '850 KB',
    date: '2024-10-18',
    status: 'Accessible',
    algorithm: 'AES-256',
    keyId: 'k-201',
    sha256: 'd4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35',
    md5: '5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
    cipherPreview: 'Made accessible in current session. Original payload accessible.',
    accessibleSample: 'MASTER SERVICES AGREEMENT between SecureVault Technologies Inc. and Enterprise Client. Governed by Delaware Law.',
    decryptedSample: 'MASTER SERVICES AGREEMENT between SecureVault Technologies Inc. and Enterprise Client. Governed by Delaware Law.'
  },
  {
    id: 'f-108',
    name: 'Cryptographic_Keys_Export.tar.gz',
    type: 'archive',
    sizeBytes: 524288, // 512 KB
    sizeStr: '512 KB',
    date: '2024-10-15',
    status: 'Secured',
    algorithm: 'AES-256',
    keyId: 'k-201',
    sha256: '4e07408562bedb8b60ce05c1decfe3ad16b72230967de01f640b7e4729b49fce',
    md5: '8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e',
    cipherPreview: 'vPq1982NmK+xV932LkM01/4nmPla9834vBx72901/01LkM9420nmQ...',
    accessibleSample: 'TAR GZ ARCHIVE: Key backups, revocation certificates, and HSM authentication tokens.',
    decryptedSample: 'TAR GZ ARCHIVE: Key backups, revocation certificates, and HSM authentication tokens.'
  }
];

const INITIAL_KEYS = [
  {
    id: 'k-201',
    name: 'Master Storage Key 2024',
    algorithm: 'AES-256',
    type: 'Symmetric (GCM)',
    fingerprint: '4a:7b:99:c2:d1:f4:88:e0',
    keyString: '0x8f3c9e12b7a456d98c21e0f3456789abcdef0123456789abcdef0123456789ab',
    created: '2024-01-10',
    status: 'Active',
    usageCount: 5
  },
  {
    id: 'k-202',
    name: 'Client RSA Keypair',
    algorithm: 'RSA-2048',
    type: 'Asymmetric (OAEP)',
    fingerprint: '9f:12:a4:e5:08:bb:33:41',
    keyString: '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0svt394...\n-----END PUBLIC KEY-----',
    created: '2024-03-14',
    status: 'Active',
    usageCount: 1
  },
  {
    id: 'k-203',
    name: 'Database Backup AES-128',
    algorithm: 'AES-128',
    type: 'Symmetric (CBC)',
    fingerprint: '11:8c:5a:33:d9:fe:66:72',
    keyString: '0x3f9a7c2b5e8d1a4c0e6b8f2d4a7c9e1b',
    created: '2023-11-05',
    status: 'Rotated',
    usageCount: 2
  },
  {
    id: 'k-204',
    name: 'ChaCha20 Backup Key',
    algorithm: 'ChaCha20-Poly1305',
    type: 'Symmetric (AEAD)',
    fingerprint: '7e:42:01:aa:5c:29:19:90',
    keyString: '0xd7a8f3b1c9e420a56b8d1f7c3e9a2b5d4e6f8a0c2e4b6d8f0a2c4e6b8d0f2a4c',
    created: '2024-06-20',
    status: 'Active',
    usageCount: 0
  }
];

const INITIAL_SHARED = [
  {
    id: 's-301',
    fileId: 'f-101',
    fileName: 'Annual_Financial_Audit_2024.pdf',
    fileType: 'pdf',
    sharedWith: 'cfo@company.org',
    permission: 'Full Access',
    shareLink: 'https://securevault.io/share/sv-8f921a99',
    sharedDate: '2024-10-28',
    expiryDate: '2024-11-04',
    status: 'Active'
  },
  {
    id: 's-302',
    fileId: 'f-104',
    fileName: 'Product_Roadmap_2025.docx',
    fileType: 'doc',
    sharedWith: 'investors@vc-firm.com',
    permission: 'View Only',
    shareLink: 'https://securevault.io/share/sv-4c120e87',
    sharedDate: '2024-10-26',
    expiryDate: '2024-11-09',
    status: 'Active'
  },
  {
    id: 's-303',
    fileId: 'f-106',
    fileName: 'Security_Architecture_Diagram.png',
    fileType: 'image',
    sharedWith: 'auditor@infosec.io',
    permission: 'Download',
    shareLink: 'https://securevault.io/share/sv-90e44b12',
    sharedDate: '2024-10-21',
    expiryDate: '2024-10-28',
    status: 'Expired'
  },
  {
    id: 's-304',
    fileId: 'f-103',
    fileName: 'Customer_Database_Backup.sql',
    fileType: 'archive',
    sharedWith: 'devops-lead@company.org',
    permission: 'Full Access',
    shareLink: 'https://securevault.io/share/sv-67a33d98',
    sharedDate: '2024-10-25',
    expiryDate: '2024-11-01',
    status: 'Active'
  }
];

const INITIAL_LOGS = [
  {
    id: 'l-401',
    timestamp: '2024-10-31 09:12:44',
    activity: 'File Secured',
    category: 'Secured',
    fileName: 'Annual_Financial_Audit_2024.pdf',
    status: 'Success',
    details: 'Cipher AES-256-GCM applied with 256-bit IV'
  },
  {
    id: 'l-402',
    timestamp: '2024-10-30 16:45:10',
    activity: 'Share Link Generated',
    category: 'Sharing',
    fileName: 'Product_Roadmap_2025.docx',
    status: 'Success',
    details: 'Permission: View Only, Expiry: 14 days'
  },
  {
    id: 'l-403',
    timestamp: '2024-10-30 11:20:05',
    activity: 'File Made Accessible',
    category: 'Accessible',
    fileName: 'Product_Roadmap_2025.docx',
    status: 'Success',
    details: 'Key validation authenticated successfully'
  },
  {
    id: 'l-404',
    timestamp: '2024-10-29 14:15:22',
    activity: 'Key Generated',
    category: 'Key Generated',
    fileName: 'N/A',
    status: 'Success',
    details: 'New ChaCha20-Poly1305 symmetric key added'
  },
  {
    id: 'l-405',
    timestamp: '2024-10-28 10:05:30',
    activity: 'File Uploaded',
    category: 'File Upload',
    fileName: 'Annual_Financial_Audit_2024.pdf',
    status: 'Success',
    details: 'Stored in secure browser local sandbox'
  },
  {
    id: 'l-406',
    timestamp: '2024-10-27 18:32:00',
    activity: 'Access Attempt',
    category: 'Accessible',
    fileName: 'Customer_Database_Backup.sql',
    status: 'Failed',
    details: 'Invalid passphrase provided (authentication tag mismatch)'
  },
  {
    id: 'l-407',
    timestamp: '2024-10-25 08:44:12',
    activity: 'Security Policy Updated',
    category: 'All Activities',
    fileName: 'N/A',
    status: 'Success',
    details: 'Default security algorithm set to AES-256'
  }
];

const INITIAL_USER = {
  name: 'Alex Rivera',
  email: 'alex.rivera@securevault.io',
  role: 'Lead Cryptography Engineer',
  avatarInitials: 'AR',
  joinedDate: 'October 12, 2024',
  plan: 'Enterprise Tier (Zero-Knowledge)',
  bio: 'Specializing in elliptic-curve cryptography and high-throughput zero-knowledge data pipelines.'
};

const INITIAL_SETTINGS = {
  twoFactor: true,
  autoLogout: '30',
  passwordProtection: true,
  defaultAlgo: 'AES-256',
  autoEncrypt: true,
  emailAlerts: true,
  clipboardTimeout: '45'
};

/**
 * Storage Service Object
 */
const StorageService = {
  init() {
    if (!localStorage.getItem(STORAGE_KEYS.FILES)) {
      localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(INITIAL_FILES));
    } else {
      // Auto-migrate legacy status labels
      try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.FILES) || '[]');
        let updated = false;
        stored.forEach(f => {
          if (f.status === 'Encrypted') { f.status = 'Secured'; updated = true; }
          if (f.status === 'Decrypted') { f.status = 'Accessible'; updated = true; }
          if (!f.accessibleSample && f.decryptedSample) { f.accessibleSample = f.decryptedSample; }
        });
        if (updated) {
          localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(stored));
        }
      } catch (e) {}
    }

    if (!localStorage.getItem(STORAGE_KEYS.KEYS)) {
      localStorage.setItem(STORAGE_KEYS.KEYS, JSON.stringify(INITIAL_KEYS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SHARED)) {
      localStorage.setItem(STORAGE_KEYS.SHARED, JSON.stringify(INITIAL_SHARED));
    }
    if (!localStorage.getItem(STORAGE_KEYS.LOGS)) {
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(INITIAL_LOGS));
    } else {
      try {
        const storedLogs = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOGS) || '[]');
        let logsUpdated = false;
        storedLogs.forEach(l => {
          if (l.activity === 'File Encrypted') { l.activity = 'File Secured'; l.category = 'Secured'; logsUpdated = true; }
          if (l.activity === 'File Decrypted') { l.activity = 'File Made Accessible'; l.category = 'Accessible'; logsUpdated = true; }
        });
        if (logsUpdated) localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(storedLogs));
      } catch (e) {}
    }

    if (!localStorage.getItem(STORAGE_KEYS.USER)) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(INITIAL_USER));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
    }
  },

  // Files CRUD
  getFiles() {
    this.init();
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.FILES)) || [];
    } catch (e) {
      return INITIAL_FILES;
    }
  },

  getFileById(id) {
    const files = this.getFiles();
    return files.find(f => f.id === id) || null;
  },

  saveFile(file) {
    const files = this.getFiles();
    const index = files.findIndex(f => f.id === file.id);
    if (index >= 0) {
      files[index] = file;
    } else {
      files.unshift(file);
    }
    localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(files));
    return file;
  },

  deleteFile(id) {
    let files = this.getFiles();
    const target = files.find(f => f.id === id);
    files = files.filter(f => f.id !== id);
    localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(files));
    if (target) {
      this.addLog('File Deleted', 'File Upload', target.name, 'Success', 'File permanently shredded from vault storage');
    }
    return true;
  },

  // Keys CRUD
  getKeys() {
    this.init();
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.KEYS)) || [];
    } catch (e) {
      return INITIAL_KEYS;
    }
  },

  saveKey(key) {
    const keys = this.getKeys();
    keys.unshift(key);
    localStorage.setItem(STORAGE_KEYS.KEYS, JSON.stringify(keys));
    this.addLog('Key Generated', 'Key Generated', 'N/A', 'Success', `Generated ${key.algorithm} key: ${key.name}`);
    return key;
  },

  deleteKey(id) {
    let keys = this.getKeys();
    const target = keys.find(k => k.id === id);
    keys = keys.filter(k => k.id !== id);
    localStorage.setItem(STORAGE_KEYS.KEYS, JSON.stringify(keys));
    if (target) {
      this.addLog('Key Revoked', 'Key Generated', 'N/A', 'Warning', `Cryptographic key '${target.name}' destroyed`);
    }
    return true;
  },

  // Shared CRUD
  getShared() {
    this.init();
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.SHARED)) || [];
    } catch (e) {
      return INITIAL_SHARED;
    }
  },

  saveShared(share) {
    const shares = this.getShared();
    shares.unshift(share);
    localStorage.setItem(STORAGE_KEYS.SHARED, JSON.stringify(shares));
    this.addLog('File Shared', 'Sharing', share.fileName, 'Success', `Shared with ${share.sharedWith} (${share.permission})`);
    return share;
  },

  revokeShared(id) {
    let shares = this.getShared();
    const target = shares.find(s => s.id === id);
    if (target) {
      target.status = 'Revoked';
      localStorage.setItem(STORAGE_KEYS.SHARED, JSON.stringify(shares));
      this.addLog('Share Revoked', 'Sharing', target.fileName, 'Warning', `Revoked access for ${target.sharedWith}`);
    }
    return true;
  },

  // Logs
  getLogs(filter = 'All') {
    this.init();
    try {
      const logs = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOGS)) || [];
      if (!filter || filter === 'All' || filter === 'All Activities') {
        return logs;
      }
      return logs.filter(l => l.category === filter || l.activity.toLowerCase().includes(filter.toLowerCase()));
    } catch (e) {
      return INITIAL_LOGS;
    }
  },

  addLog(activity, category, fileName, status, details) {
    const logs = this.getLogs();
    const now = new Date();
    const timestamp = now.toISOString().replace('T', ' ').substring(0, 19);
    const newLog = {
      id: 'l-' + Date.now().toString().slice(-4),
      timestamp,
      activity,
      category: category || 'All Activities',
      fileName: fileName || 'N/A',
      status: status || 'Success',
      details: details || ''
    };
    logs.unshift(newLog);
    // Keep max 50 logs
    if (logs.length > 50) logs.pop();
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
    return newLog;
  },

  // User Profile
  getUser() {
    this.init();
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.USER)) || INITIAL_USER;
    } catch (e) {
      return INITIAL_USER;
    }
  },

  saveUser(user) {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    return user;
  },

  // Settings
  getSettings() {
    this.init();
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS)) || INITIAL_SETTINGS;
    } catch (e) {
      return INITIAL_SETTINGS;
    }
  },

  saveSettings(settings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    this.addLog('Settings Updated', 'All Activities', 'N/A', 'Success', 'Security preferences saved');
    return settings;
  },

  // Reset to initial demo state
  resetAll() {
    localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(INITIAL_FILES));
    localStorage.setItem(STORAGE_KEYS.KEYS, JSON.stringify(INITIAL_KEYS));
    localStorage.setItem(STORAGE_KEYS.SHARED, JSON.stringify(INITIAL_SHARED));
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(INITIAL_LOGS));
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(INITIAL_USER));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
  }
};

// Initialize on script load
StorageService.init();
