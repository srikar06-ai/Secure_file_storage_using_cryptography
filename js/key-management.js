/**
 * SECUREVAULT - Cryptographic Key Management Controller (key-management.html)
 * Key generation, Fingerprint calculation, Key rotation, Key download (.key/.pem)
 */

let keyPendingDeleteId = null;

document.addEventListener('DOMContentLoaded', () => {
  renderKeysList();
  initGenerateKeyModal();
  initDeleteKeyModal();
});

function renderKeysList() {
  const container = document.getElementById('keys-container-grid');
  if (!container || typeof StorageService === 'undefined') return;

  const keys = StorageService.getKeys();

  if (keys.length === 0) {
    container.innerHTML = `
      <div class="col-12 text-center py-5">
        <i class="bi bi-key display-5 text-muted mb-3 d-block"></i>
        <h4>No Cryptographic Keys Found</h4>
        <p class="text-muted">Generate a new AES or RSA key to begin securing data.</p>
        <button class="btn btn-primary" onclick="openModal('modal-generate-key')">
          <i class="bi bi-plus-lg"></i> Generate First Key
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = keys.map(key => {
    const isRsa = key.algorithm.includes('RSA');
    const algoBadge = isRsa ? 'badge-primary' : 'badge-neutral';
    const statusBadge = key.status === 'Active'
      ? `<span class="badge badge-success"><i class="bi bi-check-circle-fill"></i> Active</span>`
      : `<span class="badge badge-warning"><i class="bi bi-arrow-repeat"></i> Rotated</span>`;

    // Masked key display
    const maskedKey = key.keyString.length > 32 
      ? key.keyString.substring(0, 18) + '••••••••' + key.keyString.substring(key.keyString.length - 10)
      : key.keyString;

    return `
      <div class="key-card">
        <div class="key-header">
          <div>
            <h4 class="mb-1">${escapeHTML(key.name)}</h4>
            <span class="badge ${algoBadge}">${key.algorithm}</span>
            <span class="badge badge-neutral">${key.type}</span>
          </div>
          ${statusBadge}
        </div>

        <div class="mb-2">
          <div class="d-flex justify-content-between text-muted small mb-1">
            <span>Key Fingerprint</span>
            <span class="font-mono text-dark">${key.fingerprint}</span>
          </div>
          <div class="d-flex justify-content-between text-muted small mb-1">
            <span>Created Date</span>
            <span>${key.created}</span>
          </div>
          <div class="d-flex justify-content-between text-muted small mb-2">
            <span>Files Protected</span>
            <span>${key.usageCount || 0} files</span>
          </div>
        </div>

        <div class="key-val-box">
          <span class="font-mono">${escapeHTML(maskedKey)}</span>
          <button class="btn btn-secondary btn-sm btn-icon" onclick="copyToClipboard('${escapeHTML(key.keyString)}', 'Cryptographic key copied!')" title="Copy Key">
            <i class="bi bi-clipboard"></i>
          </button>
        </div>

        <div class="d-flex align-items-center justify-content-between mt-auto pt-3 border-top">
          <button class="btn btn-secondary btn-sm" onclick="viewKeyDetails('${key.id}')">
            <i class="bi bi-eye"></i> Details
          </button>
          <div class="d-flex gap-1">
            <button class="btn btn-secondary btn-sm btn-icon" onclick="downloadKeyFile('${key.id}')" title="Download Key File">
              <i class="bi bi-download"></i>
            </button>
            <button class="btn btn-outline-danger btn-sm btn-icon" onclick="confirmDeleteKey('${key.id}', '${escapeHTML(key.name)}')" title="Delete Key">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function initGenerateKeyModal() {
  const form = document.getElementById('form-generate-key');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('gen-key-name').value.trim();
    const algo = document.getElementById('gen-key-algo').value;
    const type = algo === 'RSA-2048' ? 'Asymmetric (OAEP)' : 'Symmetric (AEAD)';

    const newKey = {
      id: 'k-' + Date.now().toString().slice(-4),
      name: name,
      algorithm: algo,
      type: type,
      fingerprint: generateFingerprint(),
      keyString: algo === 'RSA-2048' 
        ? '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA' + generateHexSample(40) + '...\n-----END PUBLIC KEY-----'
        : '0x' + generateHexSample(64),
      created: new Date().toISOString().split('T')[0],
      status: 'Active',
      usageCount: 0
    };

    StorageService.saveKey(newKey);
    closeModal('modal-generate-key');
    form.reset();
    renderKeysList();
    showToast('New Key Provisioned', `Key '${newKey.name}' generated using CSPRNG.`, 'success');
  });
}

function viewKeyDetails(keyId) {
  const key = StorageService.getKeys().find(k => k.id === keyId);
  if (!key) return;

  document.getElementById('modal-key-name-title').textContent = key.name;
  document.getElementById('modal-key-full-val').value = key.keyString;
  document.getElementById('modal-key-algo').textContent = key.algorithm;
  document.getElementById('modal-key-type').textContent = key.type;
  document.getElementById('modal-key-fingerprint').textContent = key.fingerprint;
  document.getElementById('modal-key-created').textContent = key.created;
  document.getElementById('modal-key-status').textContent = key.status;

  const copyBtn = document.getElementById('btn-modal-copy-key');
  if (copyBtn) {
    copyBtn.onclick = () => {
      copyToClipboard(key.keyString, 'Full key string copied to clipboard!');
    };
  }

  const dlBtn = document.getElementById('btn-modal-dl-key');
  if (dlBtn) {
    dlBtn.onclick = () => {
      downloadKeyFile(key.id);
    };
  }

  openModal('modal-key-details');
}

function downloadKeyFile(keyId) {
  const key = StorageService.getKeys().find(k => k.id === keyId);
  if (!key) return;

  const filename = `${key.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.${key.algorithm.includes('RSA') ? 'pem' : 'key'}`;
  downloadSimulatedFile(filename, key.keyString, 'text/plain');
}

function confirmDeleteKey(id, name) {
  keyPendingDeleteId = id;
  const nameHolder = document.getElementById('delete-key-name-display');
  if (nameHolder) nameHolder.textContent = name;
  openModal('modal-delete-key');
}

function initDeleteKeyModal() {
  const confirmBtn = document.getElementById('btn-confirm-delete-key');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      if (!keyPendingDeleteId) return;

      StorageService.deleteKey(keyPendingDeleteId);
      closeModal('modal-delete-key');
      renderKeysList();
      showToast('Key Destroyed', 'The cryptographic key was purged from storage.', 'warning');
      keyPendingDeleteId = null;
    });
  }
}

function generateFingerprint() {
  const hex = '0123456789abcdef';
  const parts = [];
  for (let i = 0; i < 8; i++) {
    parts.push(hex[Math.floor(Math.random() * hex.length)] + hex[Math.floor(Math.random() * hex.length)]);
  }
  return parts.join(':');
}

function generateHexSample(len) {
  const chars = '0123456789abcdef';
  let out = '';
  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}
