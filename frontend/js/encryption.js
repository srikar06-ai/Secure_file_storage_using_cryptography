/**
 * SECUREVAULT - File Securing Controller (upload.html)
 * Drag-and-Drop, Algorithm Selection, Key Generation, Multi-Stage Pipeline Simulation
 */

let selectedFile = null;
let selectedAlgorithm = 'AES-256';
let generatedMockKey = null;

document.addEventListener('DOMContentLoaded', () => {
  initDropzone();
  initAlgorithmSelector();
  initKeyGenerator();
  initPasswordProtectionToggle();
  initEncryptAction();
});

function initDropzone() {
  const dropzone = document.getElementById('file-dropzone');
  const fileInput = document.getElementById('file-upload-input');
  const browseBtn = document.getElementById('btn-browse-file');

  if (!dropzone || !fileInput) return;

  if (browseBtn) {
    browseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.click();
    });
  }

  dropzone.addEventListener('click', () => {
    fileInput.click();
  });

  // Drag over & leave
  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('dragover');
    }, false);
  });

  // Drop event
  dropzone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length) {
      handleSelectedFile(files[0]);
    }
  });

  // Input change
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length) {
      handleSelectedFile(fileInput.files[0]);
    }
  });
}

function handleSelectedFile(file) {
  selectedFile = file;

  // Show file info card, hide empty dropzone text
  const fileInfoCard = document.getElementById('selected-file-info');
  const dropzonePrompt = document.getElementById('dropzone-prompt');
  const fileNameDisplay = document.getElementById('display-file-name');
  const fileSizeDisplay = document.getElementById('display-file-size');
  const fileTypeDisplay = document.getElementById('display-file-type');
  const encryptBtn = document.getElementById('btn-start-encrypt');

  if (dropzonePrompt) dropzonePrompt.style.display = 'none';
  if (fileInfoCard) fileInfoCard.style.display = 'flex';
  if (fileNameDisplay) fileNameDisplay.textContent = file.name;
  if (fileSizeDisplay) fileSizeDisplay.textContent = formatBytes(file.size);
  if (fileTypeDisplay) fileTypeDisplay.textContent = getFileExtension(file.name).toUpperCase();
  if (encryptBtn) encryptBtn.disabled = false;

  showToast('File Loaded', `${file.name} ready for securing pipeline`, 'info');
}

function removeSelectedFile(e) {
  if (e) e.stopPropagation();
  selectedFile = null;
  const fileInput = document.getElementById('file-upload-input');
  if (fileInput) fileInput.value = '';

  const fileInfoCard = document.getElementById('selected-file-info');
  const dropzonePrompt = document.getElementById('dropzone-prompt');
  const encryptBtn = document.getElementById('btn-start-encrypt');

  if (dropzonePrompt) dropzonePrompt.style.display = 'block';
  if (fileInfoCard) fileInfoCard.style.display = 'none';
  if (encryptBtn) encryptBtn.disabled = true;
}

function initAlgorithmSelector() {
  const algoCards = document.querySelectorAll('.algo-card');
  algoCards.forEach(card => {
    card.addEventListener('click', () => {
      algoCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedAlgorithm = card.getAttribute('data-algo');

      const notice = document.getElementById('rsa-demo-notice');
      if (notice) {
        notice.style.display = selectedAlgorithm === 'RSA-2048' ? 'block' : 'none';
      }
    });
  });
}

function initKeyGenerator() {
  const btnGen = document.getElementById('btn-gen-key');
  const keyDisplay = document.getElementById('generated-key-display');

  if (btnGen && keyDisplay) {
    btnGen.addEventListener('click', () => {
      generatedMockKey = generateCryptographicKey(selectedAlgorithm);
      keyDisplay.value = generatedMockKey;
      showToast('Key Generated', `Generated 256-bit entropy key for ${selectedAlgorithm}`, 'success');
    });
  }
}

function initPasswordProtectionToggle() {
  const toggle = document.getElementById('toggle-password-protect');
  const passGroup = document.getElementById('password-protect-group');

  if (toggle && passGroup) {
    toggle.addEventListener('change', () => {
      passGroup.style.display = toggle.checked ? 'block' : 'none';
    });
  }
}

function initEncryptAction() {
  const btn = document.getElementById('btn-start-encrypt');
  if (!btn) return;

  btn.addEventListener('click', () => {
    if (!selectedFile) {
      showToast('No File', 'Please select a file to secure first.', 'warning');
      return;
    }

    startEncryptionSimulation();
  });
}

function startEncryptionSimulation() {
  const configPanel = document.getElementById('encryption-config-panel');
  const progressPanel = document.getElementById('encryption-progress-panel');
  const resultPanel = document.getElementById('encryption-result-panel');

  if (configPanel) configPanel.style.display = 'none';
  if (progressPanel) progressPanel.style.display = 'block';

  const progressBar = document.getElementById('encryption-progress-bar');
  const progressPercent = document.getElementById('encryption-progress-percent');
  const statusMessage = document.getElementById('encryption-status-message');

  const steps = [
    { pct: 25, stepId: 'step-1', msg: 'Ingesting binary stream & calculating SHA-256 integrity digest...' },
    { pct: 50, stepId: 'step-2', msg: 'Deriving 256-bit AES key via PBKDF2 (100,000 rounds)...' },
    { pct: 75, stepId: 'step-3', msg: 'Executing AES-256-GCM Galois/Counter mode block encryption...' },
    { pct: 100, stepId: 'step-4', msg: 'Computing 128-bit authentication tag & securing container...' }
  ];

  let currentStep = 0;

  function runNextStep() {
    if (currentStep < steps.length) {
      const step = steps[currentStep];
      if (progressBar) progressBar.style.width = `${step.pct}%`;
      if (progressPercent) progressPercent.textContent = `${step.pct}%`;
      if (statusMessage) statusMessage.textContent = step.msg;

      document.querySelectorAll('.pipeline-step').forEach(el => el.classList.remove('active'));
      const activeEl = document.getElementById(step.stepId);
      if (activeEl) {
        activeEl.classList.add('active');
        if (currentStep > 0) {
          const prevEl = document.getElementById(steps[currentStep - 1].stepId);
          if (prevEl) {
            prevEl.classList.remove('active');
            prevEl.classList.add('completed');
          }
        }
      }

      currentStep++;
      setTimeout(runNextStep, 500);
    } else {
      setTimeout(executeRealEncryption, 400);
    }
  }

  runNextStep();
}

async function executeRealEncryption() {
  const progressPanel = document.getElementById('encryption-progress-panel');
  const resultPanel = document.getElementById('encryption-result-panel');

  if (progressPanel) progressPanel.style.display = 'none';
  if (resultPanel) resultPanel.style.display = 'block';

  const passphraseInput = document.getElementById('custom-encryption-pass');
  const passphrase = (passphraseInput && passphraseInput.value.trim()) || 'VaultMasterKey#2024';

  let ciphertextBase64 = '';
  let saltHex = '';
  let ivHex = '';
  let fileHash = '';

  try {
    const fileBuffer = await selectedFile.arrayBuffer();
    const cryptoResult = await CryptoEngine.encryptBuffer(fileBuffer, passphrase);
    ciphertextBase64 = cryptoResult.ciphertextBase64;
    saltHex = cryptoResult.saltHex;
    ivHex = cryptoResult.ivHex;
    fileHash = cryptoResult.sha256;
  } catch (err) {
    console.error('Client encryption failed:', err);
    showToast('Encryption Error', err.message, 'error');
    return;
  }

  const encryptedFileName = selectedFile.name + '.svault';
  const now = new Date();
  const timestampStr = now.toLocaleString();
  const dateStr = now.toISOString().split('T')[0];

  // Populate Result Card
  const elName = document.getElementById('res-file-name');
  const elAlgo = document.getElementById('res-file-algo');
  const elHash = document.getElementById('res-file-hash');
  const elCipher = document.getElementById('res-cipher-preview');

  if (elName) elName.textContent = encryptedFileName;
  if (elAlgo) elAlgo.textContent = 'AES-256-GCM (100k PBKDF2 rounds, 128-bit tag)';
  if (elHash) elHash.textContent = fileHash;
  if (elCipher) elCipher.textContent = ciphertextBase64.substring(0, 160) + '... [ENCRYPTED BINARY PAYLOAD ' + ciphertextBase64.length + ' BYTES]';

  // Try backend upload if authenticated
  let backendId = null;
  if (typeof ApiService !== 'undefined' && ApiService.getToken()) {
    try {
      const uploadRes = await ApiService.uploadFile(selectedFile);
      if (uploadRes && uploadRes.data && uploadRes.data.file) {
        backendId = uploadRes.data.file.id || uploadRes.data.file._id;
        showToast('Uploaded to Cloud Vault', 'File stored on backend server.', 'success');
      }
    } catch (e) {
      console.warn('Backend upload skipped:', e.message);
    }
  }

  const keyDisplay = document.getElementById('generated-key-display');
  const currentKeyHex = (keyDisplay && keyDisplay.value.trim()) || '0x8f3c9e12b7a456d98c21e0f3456789abcdef0123456789abcdef0123456789ab';

  const newFileRecord = {
    id: backendId || ('f-' + Date.now().toString()),
    backendId: backendId,
    name: selectedFile.name,
    mimeType: selectedFile.type || 'application/octet-stream',
    type: getFileTypeCategory(selectedFile.name),
    sizeBytes: selectedFile.size,
    sizeStr: formatBytes(selectedFile.size),
    date: dateStr,
    timestamp: timestampStr,
    status: 'Secured',
    algorithm: 'AES-256-GCM',
    keyId: 'k-201',
    keyHex: currentKeyHex,
    storedPassphrase: (passphrase !== 'VaultMasterKey#2024') ? passphrase : '',
    sha256: fileHash,
    ciphertextBase64: ciphertextBase64,
    saltHex: saltHex,
    ivHex: ivHex,
    cipherPreview: ciphertextBase64.substring(0, 100) + '...',
    accessibleSample: 'Original binary stream of ' + selectedFile.name,
    decryptedSample: 'Original binary stream of ' + selectedFile.name
  };

  // Cache binary ciphertext in VaultBinaryStore
  if (typeof VaultBinaryStore !== 'undefined') {
    VaultBinaryStore.set(newFileRecord.id, ciphertextBase64);
  }

  StorageService.saveFile(newFileRecord);
  StorageService.addLog('File Secured', 'Secured', selectedFile.name, 'Success', `Secured with AES-256-GCM at ${timestampStr}`);
  showToast('File Secured', `${encryptedFileName} secured and stored in vault!`, 'success');

  // Wire up Download Secured (.svault) button
  const dlEncBtn = document.getElementById('btn-download-encrypted');
  if (dlEncBtn) {
    dlEncBtn.onclick = () => {
      if (typeof VaultContainer !== 'undefined') {
        VaultContainer.download(newFileRecord);
      } else {
        downloadSimulatedFile(encryptedFileName, ciphertextBase64, 'application/octet-stream');
      }
    };
  }

  // Test Access Now button
  const decBtn = document.getElementById('btn-decrypt-this-file');
  if (decBtn) {
    decBtn.onclick = () => {
      window.location.href = `decrypt.html?id=${newFileRecord.id}`;
    };
  }
}

function resetEncryptionForm() {
  selectedFile = null;
  const configPanel = document.getElementById('encryption-config-panel');
  const progressPanel = document.getElementById('encryption-progress-panel');
  const resultPanel = document.getElementById('encryption-result-panel');

  if (resultPanel) resultPanel.style.display = 'none';
  if (progressPanel) progressPanel.style.display = 'none';
  if (configPanel) configPanel.style.display = 'block';

  removeSelectedFile();

  // Reset steps
  document.querySelectorAll('.pipeline-step').forEach(s => {
    s.classList.remove('active', 'completed');
  });
}

/**
 * Helpers
 */
function getFileExtension(filename) {
  return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2) || 'dat';
}

function getFileTypeCategory(filename) {
  const ext = getFileExtension(filename).toLowerCase();
  if (['pdf'].includes(ext)) return 'pdf';
  if (['png', 'jpg', 'jpeg', 'svg', 'gif'].includes(ext)) return 'image';
  if (['doc', 'docx', 'txt', 'rtf'].includes(ext)) return 'doc';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'sheet';
  if (['zip', 'rar', 'tar', 'gz', 'sql'].includes(ext)) return 'archive';
  return 'code';
}

function generateCryptographicKey(algo) {
  if (algo === 'RSA-2048') {
    return '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA' + generateHex(40) + '...\n-----END PUBLIC KEY-----';
  }
  return '0x' + generateHex(64);
}

function generateHex(len) {
  const chars = '0123456789abcdef';
  let out = '';
  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function generateMockCiphertext(fileName) {
  const header = `[SVAULT_V1_HEADER_ALGO_${selectedAlgorithm}_IV_0x${generateHex(24)}]\n`;
  let body = '';
  const lines = 6;
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  for (let l = 0; l < lines; l++) {
    let line = '';
    for (let c = 0; c < 64; c++) {
      line += chars[Math.floor(Math.random() * chars.length)];
    }
    body += line + '\n';
  }
  return header + body + `[AUTH_TAG_HMAC_SHA256_0x${generateHex(32)}]`;
}
