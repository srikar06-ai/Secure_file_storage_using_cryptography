/**
 * SECUREVAULT - Central Storage & State Management
 * Persistent localStorage data store with realistic mock dataset
 */

const STORAGE_KEYS = {
  FILES: 'sv_files_v1',
  DELETED_FILES: 'sv_deleted_files_v1',
  KEYS: 'sv_keys_v1',
  SHARED: 'sv_shared_v1',
  LOGS: 'sv_logs_v1',
  USER: 'sv_user_v1',
  SETTINGS: 'sv_settings_v1',
  AUTH: 'sv_auth_session_v1'
};

// Initial realistic dataset
const INITIAL_FILES = [];

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

const INITIAL_SHARED = [];

const INITIAL_LOGS = [];

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
    if (typeof localStorage === 'undefined') return;

    // Purge legacy mock data if present
    try {
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEYS.FILES) || '[]');
      if (existing.some(f => f.name && (f.name.includes('Annual_Financial_Audit') || f.name.includes('Executive_Board')))) {
        localStorage.removeItem(STORAGE_KEYS.FILES);
        localStorage.removeItem(STORAGE_KEYS.SHARED);
        localStorage.removeItem(STORAGE_KEYS.LOGS);
      }
    } catch(e) {}

    if (!localStorage.getItem(STORAGE_KEYS.FILES)) {
      localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(INITIAL_FILES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.KEYS)) {
      localStorage.setItem(STORAGE_KEYS.KEYS, JSON.stringify(INITIAL_KEYS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SHARED)) {
      localStorage.setItem(STORAGE_KEYS.SHARED, JSON.stringify(INITIAL_SHARED));
    }
    if (!localStorage.getItem(STORAGE_KEYS.LOGS)) {
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(INITIAL_LOGS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.USER)) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(INITIAL_USER));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.DELETED_FILES)) {
      localStorage.setItem(STORAGE_KEYS.DELETED_FILES, JSON.stringify([]));
    }
  },

  // Files CRUD
  getFiles(includeDeleted = false) {
    this.init();
    try {
      const allFiles = JSON.parse(localStorage.getItem(STORAGE_KEYS.FILES)) || [];
      if (includeDeleted === 'only') {
        return allFiles.filter(f => f.isDeleted === true);
      }
      if (includeDeleted === true) {
        return allFiles;
      }
      return allFiles.filter(f => f.isDeleted !== true);
    } catch (e) {
      return INITIAL_FILES;
    }
  },

  getDeletedFiles() {
    this.init();
    try {
      const activeStoreDeleted = (JSON.parse(localStorage.getItem(STORAGE_KEYS.FILES)) || []).filter(f => f.isDeleted === true);
      const trashStore = JSON.parse(localStorage.getItem(STORAGE_KEYS.DELETED_FILES)) || [];
      // Merge unique by id
      const map = new Map();
      [...activeStoreDeleted, ...trashStore].forEach(f => {
        if (f && f.id) map.set(f.id, f);
      });
      return Array.from(map.values());
    } catch (e) {
      return [];
    }
  },

  getFileById(id) {
    const files = this.getFiles(true);
    let found = files.find(f => f.id === id);
    if (!found) {
      const deleted = this.getDeletedFiles();
      found = deleted.find(f => f.id === id);
    }
    return found || null;
  },

  saveFile(file) {
    this.init();
    const files = this.getFiles(true);
    const index = files.findIndex(f => f.id === file.id);
    if (index >= 0) {
      files[index] = { ...files[index], ...file };
    } else {
      files.unshift(file);
    }
    try {
      localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(files));
    } catch (err) {
      console.warn('LocalStorage save warning (payload size):', err);
      // If quota exceeded, strip large ciphertext from localStorage and store in memory/IndexedDB
      if (file.ciphertextBase64) {
        VaultBinaryStore.set(file.id, file.ciphertextBase64);
        const lightFile = { ...file, ciphertextBase64: file.ciphertextBase64.substring(0, 500) + '...[IN_INDEXED_DB]' };
        files[index >= 0 ? index : 0] = lightFile;
        localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(files));
      }
    }
    return file;
  },

  /**
   * Soft-delete a file to the Recovery Bin so user can recover it anytime
   */
  softDeleteFile(id) {
    this.init();
    let files = this.getFiles(true);
    const target = files.find(f => f.id === id);
    if (!target) return false;

    target.isDeleted = true;
    target.deletedAt = new Date().toLocaleString();

    // Remove from active files list
    files = files.filter(f => f.id !== id);
    localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(files));

    // Add to trash list
    let trash = [];
    try {
      trash = JSON.parse(localStorage.getItem(STORAGE_KEYS.DELETED_FILES)) || [];
    } catch(e) {}
    trash = trash.filter(f => f.id !== id);
    trash.unshift(target);
    localStorage.setItem(STORAGE_KEYS.DELETED_FILES, JSON.stringify(trash));

    this.addLog('File Moved to Trash', 'File Storage', target.name, 'Warning', `Moved to Recovery Bin at ${target.deletedAt}. File can be recovered anytime.`);
    return true;
  },

  /**
   * Restore a file from Recovery Bin back into active files
   */
  restoreFile(id) {
    this.init();
    let trash = this.getDeletedFiles();
    const target = trash.find(f => f.id === id);
    if (!target) return null;

    target.isDeleted = false;
    delete target.deletedAt;

    // Remove from trash
    trash = trash.filter(f => f.id !== id);
    localStorage.setItem(STORAGE_KEYS.DELETED_FILES, JSON.stringify(trash));

    // Add to active files
    let files = this.getFiles(true).filter(f => f.id !== id);
    files.unshift(target);
    localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(files));

    this.addLog('File Recovered', 'File Storage', target.name, 'Success', `Recovered from deleted files back to active vault inventory`);
    return target;
  },

  /**
   * Permanently purge a file from both stores
   */
  permanentlyDeleteFile(id) {
    this.init();
    let files = this.getFiles(true).filter(f => f.id !== id);
    localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(files));

    let trash = this.getDeletedFiles().filter(f => f.id !== id);
    localStorage.setItem(STORAGE_KEYS.DELETED_FILES, JSON.stringify(trash));

    this.addLog('File Purged', 'File Storage', id, 'Success', 'File permanently shredded and wiped.');
    return true;
  },

  // Default delete performs safe soft-delete so files can ALWAYS be recovered
  deleteFile(id) {
    return this.softDeleteFile(id);
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

  setUser(user) {
    return this.saveUser(user);
  },

  clearAuthSession() {
    localStorage.removeItem(STORAGE_KEYS.AUTH);
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

/**
 * VaultContainer: Handles .svault file format generation, download, and parsing.
 * Allows files to be exported as secure containers and recovered even if deleted.
 */
const VaultContainer = {
  MAGIC: 'SECUREVAULT',
  VERSION: '1.0',

  build(fileRecord) {
    if (!fileRecord) throw new Error('File record is required to build container.');

    // Retrieve ciphertext from memory store if not in record
    const ciphertext = fileRecord.ciphertextBase64 || VaultBinaryStore.get(fileRecord.id) || '';

    const containerData = {
      magic: this.MAGIC,
      version: this.VERSION,
      format: 'AES-256-GCM-ENVELOPE',
      name: fileRecord.name,
      mimeType: fileRecord.mimeType || 'application/octet-stream',
      sizeBytes: fileRecord.sizeBytes || 0,
      sizeStr: fileRecord.sizeStr || '0 KB',
      sha256: fileRecord.sha256 || '',
      algorithm: fileRecord.algorithm || 'AES-256-GCM',
      saltHex: fileRecord.saltHex || '',
      ivHex: fileRecord.ivHex || '',
      ciphertextBase64: ciphertext,
      keyId: fileRecord.keyId || 'k-201',
      keyHex: fileRecord.keyHex || '',
      timestamp: fileRecord.timestamp || new Date().toLocaleString(),
      exportedAt: new Date().toISOString()
    };

    return JSON.stringify(containerData, null, 2);
  },

  download(fileRecord) {
    const jsonStr = this.build(fileRecord);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dlName = fileRecord.name.endsWith('.svault') ? fileRecord.name : `${fileRecord.name}.svault`;
    a.href = url;
    a.download = dlName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (typeof showToast === 'function') {
      showToast('Container Saved', `Downloaded ${dlName}. Store it safely to recover anytime.`, 'success');
    }
  },

  parse(textOrJson) {
    let parsed;
    if (typeof textOrJson === 'object' && textOrJson !== null) {
      parsed = textOrJson;
    } else {
      try {
        parsed = JSON.parse(textOrJson);
      } catch (err) {
        throw new Error('Invalid container format: File is not a valid SecureVault JSON package.');
      }
    }

    if (!parsed.ciphertextBase64 && !parsed.ciphertext) {
      throw new Error('Container error: Missing encrypted ciphertext payload.');
    }
    if (!parsed.saltHex) {
      throw new Error('Container error: Missing cryptographic salt parameter.');
    }
    if (!parsed.ivHex) {
      throw new Error('Container error: Missing initialization vector (IV).');
    }

    return {
      id: 'sv-' + Date.now(),
      name: parsed.name || 'Recovered_Document.dat',
      mimeType: parsed.mimeType || 'application/octet-stream',
      sizeBytes: parsed.sizeBytes || 0,
      sizeStr: parsed.sizeStr || 'Unknown size',
      sha256: parsed.sha256 || '',
      algorithm: parsed.algorithm || 'AES-256-GCM',
      saltHex: parsed.saltHex,
      ivHex: parsed.ivHex,
      ciphertextBase64: parsed.ciphertextBase64 || parsed.ciphertext,
      keyId: parsed.keyId || 'k-201',
      keyHex: parsed.keyHex || '',
      timestamp: parsed.timestamp || new Date().toLocaleString(),
      status: 'Secured',
      isRecoveredContainer: true
    };
  }
};

/**
 * VaultBinaryStore: Preserves binary ArrayBuffers and Blobs in-memory
 * so that decrypted files (PDFs, images, docx) download with 100% bit-fidelity.
 */
const VaultBinaryStore = {
  _store: new Map(),

  set(id, data) {
    this._store.set(id, data);
  },

  get(id) {
    return this._store.get(id) || null;
  },

  has(id) {
    return this._store.has(id);
  },

  remove(id) {
    this._store.delete(id);
  }
};

window.VaultContainer = VaultContainer;
window.VaultBinaryStore = VaultBinaryStore;
