/**
 * SECUREVAULT - Access Controller (decrypt.html)
 * Secured file selector, Key verification, Accessible pipeline simulation
 */

let currentEncryptedFile = null;

document.addEventListener('DOMContentLoaded', () => {
  initEncryptedFileSelector();
  initPasswordToggle();
  initDemoKeyHelper();
  initDecryptAction();
  checkURLParams();
});

function initEncryptedFileSelector() {
  const select = document.getElementById('select-encrypted-file');
  if (!select || typeof StorageService === 'undefined') return;

  const files = StorageService.getFiles().filter(f => f.status === 'Secured' || f.status === 'Encrypted');

  select.innerHTML = '<option value="">-- Choose a secured file from your vault --</option>' +
    files.map(f => `<option value="${f.id}">${escapeHTML(f.name)} (${f.algorithm} &bull; ${f.sizeStr})</option>`).join('');

  select.addEventListener('change', () => {
    const fileId = select.value;
    if (fileId) {
      loadFileForDecryption(fileId);
    } else {
      hideFileInfo();
    }
  });
}

function checkURLParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const fileId = urlParams.get('id');
  if (fileId) {
    const select = document.getElementById('select-encrypted-file');
    if (select) {
      select.value = fileId;
      loadFileForDecryption(fileId);
    }
  }
}

function loadFileForDecryption(fileId) {
  const file = StorageService.getFileById(fileId);
  if (!file) return;

  currentEncryptedFile = file;

  // Show file info card
  const infoCard = document.getElementById('decrypt-file-info-card');
  const decryptForm = document.getElementById('decrypt-form-section');
  const emptyPrompt = document.getElementById('decrypt-empty-prompt');

  if (emptyPrompt) emptyPrompt.style.display = 'none';
  if (infoCard) infoCard.style.display = 'block';
  if (decryptForm) decryptForm.style.display = 'block';

  // Populate data
  document.getElementById('dec-info-name').textContent = file.name + '.svault';
  document.getElementById('dec-info-algo').textContent = file.algorithm;
  document.getElementById('dec-info-size').textContent = file.sizeStr;
  document.getElementById('dec-info-date').textContent = file.date;
  document.getElementById('dec-cipher-preview').textContent = file.cipherPreview || '0x8f3c...b4e1 (AES-GCM block cipher)';
}

function hideFileInfo() {
  currentEncryptedFile = null;
  const infoCard = document.getElementById('decrypt-file-info-card');
  const decryptForm = document.getElementById('decrypt-form-section');
  const emptyPrompt = document.getElementById('decrypt-empty-prompt');

  if (emptyPrompt) emptyPrompt.style.display = 'block';
  if (infoCard) infoCard.style.display = 'none';
  if (decryptForm) decryptForm.style.display = 'none';
}

function initPasswordToggle() {
  const btn = document.getElementById('btn-toggle-dec-pass');
  const input = document.getElementById('decrypt-key-input');
  if (btn && input) {
    btn.addEventListener('click', () => {
      const icon = btn.querySelector('i');
      if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('bi-eye');
        icon.classList.add('bi-eye-slash');
      } else {
        input.type = 'password';
        icon.classList.remove('bi-eye-slash');
        icon.classList.add('bi-eye');
      }
    });
  }
}

function initDemoKeyHelper() {
  const btn = document.getElementById('btn-use-demo-key');
  const input = document.getElementById('decrypt-key-input');
  if (btn && input) {
    btn.addEventListener('click', () => {
      input.value = 'VaultMasterKey#2024';
      showToast('Demo Key Injected', 'Standard vault cryptographic key loaded for demonstration.', 'info');
    });
  }
}

function initDecryptAction() {
  const btn = document.getElementById('btn-start-decrypt');
  if (!btn) return;

  btn.addEventListener('click', () => {
    if (!currentEncryptedFile) {
      showToast('Select File', 'Please choose a secured file first.', 'warning');
      return;
    }

    const keyVal = document.getElementById('decrypt-key-input').value.trim();
    if (!keyVal) {
      showToast('Key Required', 'Please enter a key/passphrase or click "Use Demo Key".', 'error');
      return;
    }

    startDecryptionSimulation();
  });
}

function startDecryptionSimulation() {
  const decryptForm = document.getElementById('decrypt-form-section');
  const progressPanel = document.getElementById('decryption-progress-panel');
  const resultPanel = document.getElementById('decryption-result-panel');

  if (decryptForm) decryptForm.style.display = 'none';
  if (progressPanel) progressPanel.style.display = 'block';

  const progressBar = document.getElementById('decryption-progress-bar');
  const progressPercent = document.getElementById('decryption-progress-percent');
  const statusMessage = document.getElementById('decryption-status-message');

  const steps = [
    { pct: 25, msg: 'Reading .svault container header & authentication tag...' },
    { pct: 50, msg: 'Validating cryptographic key & verifying MAC signature...' },
    { pct: 75, msg: `Executing inverse ${currentEncryptedFile.algorithm} Galois transformation...` },
    { pct: 100, msg: 'Reconstituting original binary payload into accessible format...' }
  ];

  let currentStep = 0;

  function runNextStep() {
    if (currentStep < steps.length) {
      const step = steps[currentStep];
      if (progressBar) progressBar.style.width = `${step.pct}%`;
      if (progressPercent) progressPercent.textContent = `${step.pct}%`;
      if (statusMessage) statusMessage.textContent = step.msg;

      currentStep++;
      setTimeout(runNextStep, 750);
    } else {
      setTimeout(finishDecryption, 500);
    }
  }

  runNextStep();
}

function finishDecryption() {
  const progressPanel = document.getElementById('decryption-progress-panel');
  const resultPanel = document.getElementById('decryption-result-panel');

  if (progressPanel) progressPanel.style.display = 'none';
  if (resultPanel) resultPanel.style.display = 'block';

  // Mark file as accessible in storage
  currentEncryptedFile.status = 'Accessible';
  StorageService.saveFile(currentEncryptedFile);
  StorageService.addLog('File Made Accessible', 'Accessible', currentEncryptedFile.name, 'Success', `Made accessible with verified ${currentEncryptedFile.algorithm} key`);

  // Populate Result Card
  const elName = document.getElementById('res-dec-name');
  const elSize = document.getElementById('res-dec-size');
  const elPreview = document.getElementById('res-decrypted-content');

  if (elName) elName.textContent = currentEncryptedFile.name;
  if (elSize) elSize.textContent = currentEncryptedFile.sizeStr;
  if (elPreview) elPreview.textContent = currentEncryptedFile.accessibleSample || currentEncryptedFile.decryptedSample || 'Plaintext payload restored successfully into accessible memory.';

  showToast('File Accessible', `${currentEncryptedFile.name} verified and accessible!`, 'success');

  // Setup Download Accessible File
  const dlBtn = document.getElementById('btn-download-decrypted');
  if (dlBtn) {
    dlBtn.onclick = () => {
      downloadSimulatedFile(currentEncryptedFile.name, currentEncryptedFile.accessibleSample || currentEncryptedFile.decryptedSample || 'Original file content.', 'text/plain');
    };
  }
}
