/**
 * SECUREVAULT - File Management Controller (my-files.html)
 * Supports:
 * - Active Files and Recovery Bin (Deleted Files) with 1-click file restoration
 * - Download Secured Container (.svault) for offline backup
 * - Real bit-perfect binary file downloads for accessible/reconstituted files
 * - Search, Type Filter, Status Filter, Sorting, Grid/List Views, Pagination
 */

let currentViewMode = 'list'; // 'list' | 'grid'
let currentPage = 1;
const ITEMS_PER_PAGE = 6;
let filePendingDeleteId = null;
let isRecoveryBinMode = false;

document.addEventListener('DOMContentLoaded', () => {
  initURLSearchParams();
  initViewToggle();
  initTrashToggle();
  initFilterListeners();
  updateTrashBadge();
  renderFiles();
  initDeleteModal();
  initShareModalInFiles();
});

function initURLSearchParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const searchParam = urlParams.get('search');
  if (searchParam) {
    const searchInput = document.getElementById('files-search-input');
    if (searchInput) searchInput.value = searchParam;
  }
  const viewParam = urlParams.get('view');
  if (viewParam === 'trash') {
    isRecoveryBinMode = true;
    updateTrashUI();
  }
}

function initViewToggle() {
  const btnList = document.getElementById('btn-view-list');
  const btnGrid = document.getElementById('btn-view-grid');

  if (btnList && btnGrid) {
    btnList.addEventListener('click', () => {
      currentViewMode = 'list';
      btnList.classList.add('active');
      btnGrid.classList.remove('active');
      renderFiles();
    });

    btnGrid.addEventListener('click', () => {
      currentViewMode = 'grid';
      btnGrid.classList.add('active');
      btnList.classList.remove('active');
      renderFiles();
    });
  }
}

function initTrashToggle() {
  const btnTrash = document.getElementById('btn-toggle-trash');
  if (btnTrash) {
    btnTrash.addEventListener('click', () => {
      isRecoveryBinMode = !isRecoveryBinMode;
      updateTrashUI();
      currentPage = 1;
      renderFiles();
    });
  }
}

function updateTrashUI() {
  const btnTrash = document.getElementById('btn-toggle-trash');
  const pageTitle = document.querySelector('.page-title-group h1');
  const pageDesc = document.querySelector('.page-title-group p');

  if (isRecoveryBinMode) {
    if (btnTrash) {
      btnTrash.className = 'btn btn-primary';
      btnTrash.innerHTML = `<i class="bi bi-folder2-open"></i> Back to Active Files`;
    }
    if (pageTitle) pageTitle.textContent = 'Recovery Bin (Deleted Files)';
    if (pageDesc) pageDesc.textContent = 'Restore deleted files back to your active vault, or purge permanently.';
  } else {
    if (btnTrash) {
      btnTrash.className = 'btn btn-outline-secondary';
      const count = StorageService.getDeletedFiles().length;
      btnTrash.innerHTML = `<i class="bi bi-trash3"></i> Recovery Bin (<span id="trash-badge-count">${count}</span>)`;
    }
    if (pageTitle) pageTitle.textContent = 'Secured Vault Files';
    if (pageDesc) pageDesc.textContent = 'Manage, access, download, or share your zero-knowledge protected documents.';
  }
}

function updateTrashBadge() {
  const badge = document.getElementById('trash-badge-count');
  if (badge && typeof StorageService !== 'undefined') {
    const count = StorageService.getDeletedFiles().length;
    badge.textContent = count;
  }
}

function initFilterListeners() {
  const searchInput = document.getElementById('files-search-input');
  const typeFilter = document.getElementById('files-filter-type');
  const statusFilter = document.getElementById('files-filter-status');
  const sortSelect = document.getElementById('files-sort-select');

  if (searchInput) searchInput.addEventListener('input', () => { currentPage = 1; renderFiles(); });
  if (typeFilter) typeFilter.addEventListener('change', () => { currentPage = 1; renderFiles(); });
  if (statusFilter) {
    statusFilter.addEventListener('change', () => {
      if (statusFilter.value === 'deleted') {
        isRecoveryBinMode = true;
        updateTrashUI();
      } else if (isRecoveryBinMode) {
        isRecoveryBinMode = false;
        updateTrashUI();
      }
      currentPage = 1;
      renderFiles();
    });
  }
  if (sortSelect) sortSelect.addEventListener('change', () => { renderFiles(); });
}

function getFilteredFiles() {
  if (typeof StorageService === 'undefined') return [];

  let files = isRecoveryBinMode
    ? StorageService.getDeletedFiles()
    : StorageService.getFiles(false);

  const searchQuery = (document.getElementById('files-search-input')?.value || '').toLowerCase().trim();
  const typeFilter = document.getElementById('files-filter-type')?.value || 'all';
  const statusFilter = document.getElementById('files-filter-status')?.value || 'all';
  const sortOption = document.getElementById('files-sort-select')?.value || 'date-desc';

  // Search
  if (searchQuery) {
    files = files.filter(f => f.name.toLowerCase().includes(searchQuery) || (f.algorithm && f.algorithm.toLowerCase().includes(searchQuery)));
  }

  // Type filter
  if (typeFilter !== 'all') {
    files = files.filter(f => f.type === typeFilter);
  }

  // Status filter
  if (!isRecoveryBinMode && statusFilter !== 'all') {
    if (statusFilter === 'secured' || statusFilter === 'encrypted') {
      files = files.filter(f => f.status === 'Secured' || f.status === 'Encrypted');
    } else if (statusFilter === 'accessible' || statusFilter === 'decrypted') {
      files = files.filter(f => f.status === 'Accessible' || f.status === 'Decrypted');
    }
  }

  // Sorting
  files.sort((a, b) => {
    switch (sortOption) {
      case 'name-asc': return a.name.localeCompare(b.name);
      case 'name-desc': return b.name.localeCompare(a.name);
      case 'size-asc': return (a.sizeBytes || 0) - (b.sizeBytes || 0);
      case 'size-desc': return (b.sizeBytes || 0) - (a.sizeBytes || 0);
      case 'date-asc': return new Date(a.date || a.timestamp) - new Date(b.date || b.timestamp);
      case 'date-desc':
      default: return new Date(b.date || b.timestamp) - new Date(a.date || a.timestamp);
    }
  });

  return files;
}

function renderFiles() {
  updateTrashBadge();
  const filteredFiles = getFilteredFiles();
  const totalItems = filteredFiles.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;

  if (currentPage > totalPages) currentPage = totalPages;
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageFiles = filteredFiles.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  const listContainer = document.getElementById('files-list-container');
  const gridContainer = document.getElementById('files-grid-container');
  const emptyState = document.getElementById('files-empty-state');
  const paginationElem = document.getElementById('files-pagination');

  if (totalItems === 0) {
    if (listContainer) listContainer.style.display = 'none';
    if (gridContainer) gridContainer.style.display = 'none';
    if (emptyState) {
      emptyState.style.display = 'block';
      const emptyH4 = emptyState.querySelector('h4');
      const emptyP = emptyState.querySelector('p');
      if (isRecoveryBinMode) {
        if (emptyH4) emptyH4.textContent = 'Recovery Bin is Empty';
        if (emptyP) emptyP.textContent = 'No files have been deleted. Files moved to the Recovery Bin will appear here for easy restoration.';
      } else {
        if (emptyH4) emptyH4.textContent = 'No matching files found';
        if (emptyP) emptyP.textContent = 'No files in your secured vault match your current search criteria or filters.';
      }
    }
    if (paginationElem) paginationElem.style.display = 'none';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';
  if (paginationElem) paginationElem.style.display = 'flex';

  if (currentViewMode === 'list') {
    if (gridContainer) gridContainer.style.display = 'none';
    if (listContainer) {
      listContainer.style.display = 'block';
      renderListView(pageFiles);
    }
  } else {
    if (listContainer) listContainer.style.display = 'none';
    if (gridContainer) {
      gridContainer.style.display = 'grid';
      renderGridView(pageFiles);
    }
  }

  renderPagination(totalItems, totalPages);
}

function renderListView(files) {
  const tbody = document.getElementById('files-table-tbody');
  if (!tbody) return;

  tbody.innerHTML = files.map(file => {
    const iconClass = getFileIconClass(file.type);
    const isSecured = file.status === 'Secured' || file.status === 'Encrypted';
    const statusBadge = isRecoveryBinMode
      ? `<span class="badge badge-warning"><i class="bi bi-trash3"></i> In Trash (${file.deletedAt || 'Deleted'})</span>`
      : (isSecured
        ? `<span class="badge badge-primary"><i class="bi bi-lock-fill"></i> Secured (${file.algorithm})</span>`
        : `<span class="badge badge-success"><i class="bi bi-unlock-fill"></i> Accessible</span>`);

    let actionsHtml = '';
    if (isRecoveryBinMode) {
      actionsHtml = `
        <button class="btn btn-success btn-sm" onclick="restoreFileAction('${file.id}')" title="Restore File">
          <i class="bi bi-arrow-counterclockwise"></i> Restore
        </button>
        <button class="btn btn-outline-danger btn-sm btn-icon" onclick="purgeFileAction('${file.id}', '${escapeHTML(file.name)}')" title="Purge Permanently">
          <i class="bi bi-x-circle"></i>
        </button>
      `;
    } else {
      actionsHtml = `
        <a href="file-details.html?id=${file.id}" class="btn btn-secondary btn-sm btn-icon" title="File Details">
          <i class="bi bi-eye"></i>
        </a>
        ${isSecured 
          ? `<a href="decrypt.html?id=${file.id}" class="btn btn-outline-primary btn-sm btn-icon" title="Make Accessible">
               <i class="bi bi-unlock"></i>
             </a>` 
          : `<button class="btn btn-success btn-sm btn-icon" onclick="downloadRealFileAction('${file.id}')" title="Download Reconstituted File">
               <i class="bi bi-download"></i>
             </button>`
        }
        <button class="btn btn-secondary btn-sm btn-icon" onclick="downloadContainerAction('${file.id}')" title="Download Secured Container (.svault)">
          <i class="bi bi-shield-lock"></i>
        </button>
        <button class="btn btn-secondary btn-sm btn-icon" onclick="openShareModalForFile('${file.id}')" title="Share">
          <i class="bi bi-share"></i>
        </button>
        <button class="btn btn-outline-danger btn-sm btn-icon" onclick="confirmDeleteFile('${file.id}', '${escapeHTML(file.name)}')" title="Move to Recovery Bin">
          <i class="bi bi-trash"></i>
        </button>
      `;
    }

    return `
      <tr>
        <td>
          <div class="file-name-cell">
            <div class="file-type-icon ${iconClass.wrapper}">
              <i class="bi ${iconClass.icon}"></i>
            </div>
            <div>
              <a href="file-details.html?id=${file.id}" class="file-title-text">${escapeHTML(file.name)}</a>
              <span class="file-sub-text">SHA-256: ${file.sha256 ? file.sha256.substring(0, 16) + '...' : 'N/A'}</span>
            </div>
          </div>
        </td>
        <td><span class="badge badge-neutral">${file.type.toUpperCase()}</span></td>
        <td>${file.sizeStr}</td>
        <td>${file.date || file.timestamp || 'N/A'}</td>
        <td>${statusBadge}</td>
        <td>
          <div class="d-flex align-items-center gap-1">
            ${actionsHtml}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderGridView(files) {
  const gridContainer = document.getElementById('files-grid-container');
  if (!gridContainer) return;

  gridContainer.innerHTML = files.map(file => {
    const iconClass = getFileIconClass(file.type);
    const isSecured = file.status === 'Secured' || file.status === 'Encrypted';
    const statusBadge = isRecoveryBinMode
      ? `<span class="badge badge-warning"><i class="bi bi-trash3"></i> Deleted</span>`
      : (isSecured
        ? `<span class="badge badge-primary"><i class="bi bi-lock-fill"></i> Secured (${file.algorithm})</span>`
        : `<span class="badge badge-success"><i class="bi bi-unlock-fill"></i> Accessible</span>`);

    let actionsHtml = '';
    if (isRecoveryBinMode) {
      actionsHtml = `
        <button class="btn btn-success btn-sm" onclick="restoreFileAction('${file.id}')" title="Restore File">
          <i class="bi bi-arrow-counterclockwise"></i> Restore
        </button>
        <button class="btn btn-outline-danger btn-sm btn-icon" onclick="purgeFileAction('${file.id}', '${escapeHTML(file.name)}')" title="Purge Permanently">
          <i class="bi bi-x-circle"></i>
        </button>
      `;
    } else {
      actionsHtml = `
        <a href="file-details.html?id=${file.id}" class="btn btn-secondary btn-sm btn-icon" title="Details">
          <i class="bi bi-eye"></i>
        </a>
        ${isSecured
          ? `<a href="decrypt.html?id=${file.id}" class="btn btn-outline-primary btn-sm btn-icon" title="Make Accessible">
               <i class="bi bi-unlock"></i>
             </a>`
          : `<button class="btn btn-success btn-sm btn-icon" onclick="downloadRealFileAction('${file.id}')" title="Download Reconstituted File">
               <i class="bi bi-download"></i>
             </button>`
        }
        <button class="btn btn-secondary btn-sm btn-icon" onclick="downloadContainerAction('${file.id}')" title="Download Secured Container (.svault)">
          <i class="bi bi-shield-lock"></i>
        </button>
        <button class="btn btn-secondary btn-sm btn-icon" onclick="openShareModalForFile('${file.id}')" title="Share">
          <i class="bi bi-share"></i>
        </button>
        <button class="btn btn-outline-danger btn-sm btn-icon" onclick="confirmDeleteFile('${file.id}', '${escapeHTML(file.name)}')" title="Delete">
          <i class="bi bi-trash"></i>
        </button>
      `;
    }

    return `
      <div class="file-card-item">
        <div class="file-card-header">
          <div class="file-type-icon ${iconClass.wrapper}">
            <i class="bi ${iconClass.icon}"></i>
          </div>
          ${statusBadge}
        </div>
        <div class="file-card-body">
          <a href="file-details.html?id=${file.id}" class="file-card-name" title="${escapeHTML(file.name)}">
            ${escapeHTML(file.name)}
          </a>
          <div class="file-card-meta">
            <span>${file.sizeStr}</span> &bull; <span>${file.date || file.timestamp}</span>
          </div>
        </div>
        <div class="file-card-footer">
          <span class="badge badge-neutral">${file.type.toUpperCase()}</span>
          <div class="file-card-actions">
            ${actionsHtml}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderPagination(totalItems, totalPages) {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);

  const paginationInfo = document.getElementById('pagination-info');
  if (paginationInfo) {
    paginationInfo.textContent = `Showing ${startItem} to ${endItem} of ${totalItems} files`;
  }

  const pagesContainer = document.getElementById('pagination-pages-list');
  if (!pagesContainer) return;

  let pagesHtml = '';
  pagesHtml += `
    <button type="button" class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="goToPage(${currentPage - 1})">
      <i class="bi bi-chevron-left"></i>
    </button>
  `;

  for (let p = 1; p <= totalPages; p++) {
    pagesHtml += `
      <button type="button" class="page-btn ${p === currentPage ? 'active' : ''}" onclick="goToPage(${p})">
        ${p}
      </button>
    `;
  }

  pagesHtml += `
    <button type="button" class="page-btn ${currentPage === totalPages ? 'disabled' : ''} onclick="goToPage(${currentPage + 1})">
      <i class="bi bi-chevron-right"></i>
    </button>
  `;

  pagesContainer.innerHTML = pagesHtml;
}

function goToPage(page) {
  currentPage = page;
  renderFiles();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Download container (.svault) for offline safe recovery
 */
function downloadContainerAction(fileId) {
  const file = StorageService.getFileById(fileId);
  if (!file) return;

  if (typeof VaultContainer !== 'undefined') {
    VaultContainer.download(file);
  } else {
    showToast('Download Error', 'VaultContainer utility not found.', 'error');
  }
}

/**
 * Real binary file download
 */
async function downloadRealFileAction(fileId) {
  const file = StorageService.getFileById(fileId);
  if (!file) return;

  // 1. Check if Blob/URL exists in VaultBinaryStore
  const cachedBlob = typeof VaultBinaryStore !== 'undefined' ? VaultBinaryStore.get(`decrypted_${file.id}`) : null;
  if (cachedBlob instanceof Blob) {
    const url = URL.createObjectURL(cachedBlob);
    triggerDownloadUrl(url, file.name);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Download Started', `Downloading original ${file.name}`, 'success');
    return;
  }

  // 2. If file has backendId and ApiService is logged in, download from backend
  if (file.backendId && typeof ApiService !== 'undefined' && ApiService.getToken()) {
    try {
      await ApiService.downloadFile(file.backendId, file.name);
      showToast('File Downloaded', `Downloaded from cloud vault: ${file.name}`, 'success');
      return;
    } catch(err) {
      console.warn('Backend download fallback:', err);
    }
  }

  // 3. If file has ciphertextBase64, decrypt on the fly
  if (file.ciphertextBase64 && file.saltHex && file.ivHex) {
    try {
      showToast('Preparing File', 'Decrypting binary stream...', 'info');
      const decryptedBuf = await CryptoEngine.decryptBuffer(
        file.ciphertextBase64,
        file.saltHex,
        file.ivHex,
        file.storedPassphrase || 'VaultMasterKey#2024',
        { keyHex: file.keyHex, storedPassphrase: file.storedPassphrase }
      );
      const mime = file.mimeType || 'application/octet-stream';
      const blob = new Blob([decryptedBuf], { type: mime });
      const url = URL.createObjectURL(blob);
      triggerDownloadUrl(url, file.name);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast('Download Complete', `${file.name} downloaded bit-perfectly!`, 'success');
      return;
    } catch (err) {
      console.warn('On-the-fly decryption failed, falling back to sample:', err);
    }
  }

  // 4. Fallback text content
  const content = file.accessibleSample || file.decryptedSample || 'Recovered content of ' + file.name;
  downloadSimulatedFile(file.name, content, file.mimeType || 'text/plain');
}

function triggerDownloadUrl(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Delete File Flow & Modal
 */
function initDeleteModal() {
  const confirmBtn = document.getElementById('btn-confirm-delete');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      if (!filePendingDeleteId) return;

      StorageService.softDeleteFile(filePendingDeleteId);
      closeModal('modal-delete-file');
      showToast('Moved to Recovery Bin', 'File moved to Recovery Bin. You can restore it anytime!', 'warning');
      renderFiles();
      filePendingDeleteId = null;
    });
  }
}

function confirmDeleteFile(id, name) {
  filePendingDeleteId = id;
  const namePlaceholder = document.getElementById('delete-file-name-placeholder');
  if (namePlaceholder) namePlaceholder.textContent = name;
  openModal('modal-delete-file');
}

/**
 * Recovery Bin Actions
 */
function restoreFileAction(fileId) {
  const restored = StorageService.restoreFile(fileId);
  if (restored) {
    showToast('File Recovered', `"${restored.name}" has been restored to your active vault!`, 'success');
    renderFiles();
  }
}

function purgeFileAction(fileId, name) {
  if (confirm(`Permanently purge and cryptographically wipe "${name}"? This cannot be undone.`)) {
    StorageService.permanentlyDeleteFile(fileId);
    showToast('File Purged', `"${name}" permanently wiped from storage.`, 'info');
    renderFiles();
  }
}

/**
 * Share Modal triggered from files page
 */
function initShareModalInFiles() {
  const form = document.getElementById('quick-share-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fileId = document.getElementById('quick-share-file-id').value;
    const email = document.getElementById('quick-share-email').value;
    const permission = document.getElementById('quick-share-permission').value;
    const expiry = document.getElementById('quick-share-expiry').value;

    const file = StorageService.getFileById(fileId);
    if (!file) return;

    const newShare = {
      id: 's-' + Date.now().toString().slice(-4),
      fileId: file.id,
      fileName: file.name,
      fileType: file.type,
      sharedWith: email,
      permission: permission,
      shareLink: `https://securevault.io/share/sv-${Math.random().toString(36).substring(2, 10)}`,
      sharedDate: new Date().toISOString().split('T')[0],
      expiryDate: expiry,
      status: 'Active'
    };

    StorageService.saveShared(newShare);
    closeModal('modal-quick-share');
    showToast('Secure Share Generated', `Link created for ${email}`, 'success');
  });
}

function openShareModalForFile(fileId) {
  const file = StorageService.getFileById(fileId);
  if (!file) return;

  document.getElementById('quick-share-file-id').value = file.id;
  document.getElementById('quick-share-filename-display').textContent = file.name;

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const expiryInput = document.getElementById('quick-share-expiry');
  if (expiryInput) expiryInput.value = nextWeek.toISOString().split('T')[0];

  openModal('modal-quick-share');
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
