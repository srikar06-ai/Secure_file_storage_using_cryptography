/**
 * SECUREVAULT - Dashboard Controller
 * Metric calculations, Recent Files table, Activity Feed, Storage visualization
 */

document.addEventListener('DOMContentLoaded', () => {
  renderDashboardMetrics();
  renderRecentFiles();
  renderRecentActivity();
  renderStorageVisualizer();
});

function renderDashboardMetrics() {
  if (typeof StorageService === 'undefined') return;

  const files = StorageService.getFiles();
  const shared = StorageService.getShared();

  const totalFiles = files.length;
  const securedCount = files.filter(f => f.status === 'Secured' || f.status === 'Encrypted').length;
  const sharedCount = shared.filter(s => s.status === 'Active').length;

  let totalBytes = files.reduce((acc, f) => acc + (f.sizeBytes || 1024 * 500), 0);
  const formattedStorage = formatBytes(totalBytes);

  // Update DOM elements
  const elTotal = document.getElementById('metric-total-files');
  const elSecured = document.getElementById('metric-encrypted-files');
  const elShared = document.getElementById('metric-shared-files');
  const elStorage = document.getElementById('metric-storage-used');

  if (elTotal) elTotal.textContent = totalFiles;
  if (elSecured) elSecured.textContent = securedCount;
  if (elShared) elShared.textContent = sharedCount;
  if (elStorage) elStorage.textContent = formattedStorage;

  // Sidebar mini storage widget
  const quotaBytes = 10 * 1024 * 1024 * 1024; // 10 GB Demo Quota
  const percentUsed = Math.min(100, Math.max(1, (totalBytes / quotaBytes) * 100)).toFixed(1);
  const sidebarStorageBar = document.getElementById('sidebar-storage-bar');
  const sidebarStorageText = document.getElementById('sidebar-storage-text');

  if (sidebarStorageBar) sidebarStorageBar.style.width = `${percentUsed}%`;
  if (sidebarStorageText) sidebarStorageText.textContent = `${formattedStorage} of 10 GB`;
}

function renderRecentFiles() {
  const container = document.getElementById('recent-files-tbody');
  if (!container || typeof StorageService === 'undefined') return;

  const files = StorageService.getFiles().slice(0, 5);

  if (files.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="5" class="text-center py-4 text-muted">
          <i class="bi bi-folder2-open display-6 d-block mb-2 text-muted"></i>
          No files stored in vault yet.
        </td>
      </tr>
    `;
    return;
  }

  container.innerHTML = files.map(file => {
    const iconClass = getFileIconClass(file.type);
    const isSecured = file.status === 'Secured' || file.status === 'Encrypted';
    const statusBadge = isSecured
      ? `<span class="badge badge-primary"><i class="bi bi-lock-fill"></i> Secured (${file.algorithm})</span>`
      : `<span class="badge badge-success"><i class="bi bi-unlock-fill"></i> Accessible</span>`;

    return `
      <tr>
        <td>
          <div class="file-name-cell">
            <div class="file-type-icon ${iconClass.wrapper}">
              <i class="bi ${iconClass.icon}"></i>
            </div>
            <div>
              <a href="file-details.html?id=${file.id}" class="file-title-text">${escapeHTML(file.name)}</a>
              <span class="file-sub-text">${file.type.toUpperCase()} &bull; ${file.sizeStr}</span>
            </div>
          </div>
        </td>
        <td>${file.date}</td>
        <td>${statusBadge}</td>
        <td>
          <div class="d-flex align-items-center gap-1">
            <a href="file-details.html?id=${file.id}" class="btn btn-secondary btn-sm btn-icon" title="View Details">
              <i class="bi bi-eye"></i>
            </a>
            ${isSecured 
              ? `<a href="decrypt.html?id=${file.id}" class="btn btn-outline-primary btn-sm btn-icon" title="Make Accessible">
                   <i class="bi bi-unlock"></i>
                 </a>
                 <button class="btn btn-secondary btn-sm btn-icon" onclick="downloadDashboardContainer('${file.id}')" title="Download Container (.svault)">
                   <i class="bi bi-shield-lock"></i>
                 </button>` 
              : `<button class="btn btn-success btn-sm btn-icon" onclick="downloadDashboardFile('${file.id}')" title="Download File">
                   <i class="bi bi-download"></i>
                 </button>
                 <button class="btn btn-secondary btn-sm btn-icon" onclick="downloadDashboardContainer('${file.id}')" title="Download Container (.svault)">
                   <i class="bi bi-shield-lock"></i>
                 </button>`
            }
            <button class="btn btn-secondary btn-sm btn-icon" onclick="triggerQuickShare('${file.id}')" title="Share Securely">
              <i class="bi bi-share"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderRecentActivity() {
  const container = document.getElementById('recent-activity-list');
  if (!container || typeof StorageService === 'undefined') return;

  const logs = StorageService.getLogs().slice(0, 5);

  if (logs.length === 0) {
    container.innerHTML = '<p class="text-muted text-center py-3">No activity logs recorded yet.</p>';
    return;
  }

  container.innerHTML = logs.map(log => {
    let icon = 'bi-activity';
    let iconBg = 'stat-icon-blue';

    if (log.category === 'Secured' || log.category === 'Encryption' || log.activity.includes('Secured') || log.activity.includes('Encrypted')) {
      icon = 'bi-lock-fill';
      iconBg = 'stat-icon-blue';
    } else if (log.category === 'Accessible' || log.category === 'Decryption' || log.activity.includes('Accessible') || log.activity.includes('Decrypted')) {
      icon = 'bi-unlock-fill';
      iconBg = 'stat-icon-green';
    } else if (log.category === 'Sharing' || log.activity.includes('Shared')) {
      icon = 'bi-share-fill';
      iconBg = 'stat-icon-purple';
    } else if (log.activity.includes('Deleted')) {
      icon = 'bi-trash-fill';
      iconBg = 'stat-icon-amber';
    }

    return `
      <div class="activity-item">
        <div class="activity-icon ${iconBg}">
          <i class="bi ${icon}"></i>
        </div>
        <div class="activity-details">
          <div class="activity-text">
            <strong>${escapeHTML(log.activity)}</strong>: ${escapeHTML(log.details || log.fileName)}
          </div>
          <div class="activity-meta">
            <span>${log.timestamp}</span> &bull; 
            <span class="text-${log.status === 'Success' ? 'success' : 'danger'}">${log.status}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderStorageVisualizer() {
  if (typeof StorageService === 'undefined') return;
  const files = StorageService.getFiles();

  let docsBytes = 0;
  let imagesBytes = 0;
  let archivesBytes = 0;
  let othersBytes = 0;

  files.forEach(f => {
    const bytes = f.sizeBytes || 1024 * 500;
    if (f.type === 'pdf' || f.type === 'doc') docsBytes += bytes;
    else if (f.type === 'image') imagesBytes += bytes;
    else if (f.type === 'archive') archivesBytes += bytes;
    else othersBytes += bytes;
  });

  const total = docsBytes + imagesBytes + archivesBytes + othersBytes || 1;

  const docsPct = Math.round((docsBytes / total) * 100);
  const imagesPct = Math.round((imagesBytes / total) * 100);
  const archivesPct = Math.round((archivesBytes / total) * 100);
  const othersPct = 100 - (docsPct + imagesPct + archivesPct);

  const segDocs = document.getElementById('seg-docs');
  const segImages = document.getElementById('seg-images');
  const segArchives = document.getElementById('seg-archives');
  const segOther = document.getElementById('seg-other');

  if (segDocs) segDocs.style.width = `${docsPct}%`;
  if (segImages) segImages.style.width = `${imagesPct}%`;
  if (segArchives) segArchives.style.width = `${archivesPct}%`;
  if (segOther) segOther.style.width = `${Math.max(0, othersPct)}%`;

  // Update Legend text
  const legDocs = document.getElementById('legend-docs-val');
  const legImages = document.getElementById('legend-images-val');
  const legArchives = document.getElementById('legend-archives-val');
  const legOther = document.getElementById('legend-other-val');

  if (legDocs) legDocs.textContent = formatBytes(docsBytes);
  if (legImages) legImages.textContent = formatBytes(imagesBytes);
  if (legArchives) legArchives.textContent = formatBytes(archivesBytes);
  if (legOther) legOther.textContent = formatBytes(othersBytes);
}

function getFileIconClass(type) {
  switch (type) {
    case 'pdf': return { wrapper: 'icon-pdf', icon: 'bi-file-earmark-pdf-fill' };
    case 'image': return { wrapper: 'icon-image', icon: 'bi-file-earmark-image-fill' };
    case 'doc': return { wrapper: 'icon-doc', icon: 'bi-file-earmark-word-fill' };
    case 'sheet': return { wrapper: 'icon-sheet', icon: 'bi-file-earmark-excel-fill' };
    case 'archive': return { wrapper: 'icon-archive', icon: 'bi-file-earmark-zip-fill' };
    default: return { wrapper: 'icon-code', icon: 'bi-file-earmark-text-fill' };
  }
}

function triggerQuickShare(fileId) {
  window.location.href = `shared-files.html?shareFileId=${fileId}`;
}

function downloadDashboardContainer(fileId) {
  const file = StorageService.getFileById(fileId);
  if (!file) return;
  if (typeof VaultContainer !== 'undefined') {
    VaultContainer.download(file);
  }
}

async function downloadDashboardFile(fileId) {
  const file = StorageService.getFileById(fileId);
  if (!file) return;

  const cachedBlob = typeof VaultBinaryStore !== 'undefined' ? VaultBinaryStore.get(`decrypted_${file.id}`) : null;
  if (cachedBlob instanceof Blob) {
    const url = URL.createObjectURL(cachedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Download Started', `Downloading original ${file.name}`, 'success');
    return;
  }

  if (file.ciphertextBase64 && file.saltHex && file.ivHex) {
    try {
      showToast('Preparing File', 'Decrypting stream...', 'info');
      const decryptedBuf = await CryptoEngine.decryptBuffer(
        file.ciphertextBase64,
        file.saltHex,
        file.ivHex,
        file.storedPassphrase || 'VaultMasterKey#2024',
        { keyHex: file.keyHex, storedPassphrase: file.storedPassphrase }
      );
      const blob = new Blob([decryptedBuf], { type: file.mimeType || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast('Download Complete', `${file.name} downloaded bit-perfectly!`, 'success');
      return;
    } catch (err) {
      console.warn('Dashboard decryption fallback:', err);
    }
  }

  downloadSimulatedFile(file.name, file.accessibleSample || file.decryptedSample || 'Plaintext payload.', file.mimeType || 'text/plain');
}
