/**
 * SECUREVAULT - File Management Controller (my-files.html)
 * Search, Type Filter, Status Filter, Sorting, Grid/List Views, Pagination, Deletion Modal
 */

let currentViewMode = 'list'; // 'list' | 'grid'
let currentPage = 1;
const ITEMS_PER_PAGE = 6;
let filePendingDeleteId = null;

document.addEventListener('DOMContentLoaded', () => {
  initURLSearchParams();
  initViewToggle();
  initFilterListeners();
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

function initFilterListeners() {
  const searchInput = document.getElementById('files-search-input');
  const typeFilter = document.getElementById('files-filter-type');
  const statusFilter = document.getElementById('files-filter-status');
  const sortSelect = document.getElementById('files-sort-select');

  if (searchInput) searchInput.addEventListener('input', () => { currentPage = 1; renderFiles(); });
  if (typeFilter) typeFilter.addEventListener('change', () => { currentPage = 1; renderFiles(); });
  if (statusFilter) statusFilter.addEventListener('change', () => { currentPage = 1; renderFiles(); });
  if (sortSelect) sortSelect.addEventListener('change', () => { renderFiles(); });
}

function getFilteredFiles() {
  if (typeof StorageService === 'undefined') return [];
  let files = StorageService.getFiles();

  const searchQuery = (document.getElementById('files-search-input')?.value || '').toLowerCase().trim();
  const typeFilter = document.getElementById('files-filter-type')?.value || 'all';
  const statusFilter = document.getElementById('files-filter-status')?.value || 'all';
  const sortOption = document.getElementById('files-sort-select')?.value || 'date-desc';

  // Search
  if (searchQuery) {
    files = files.filter(f => f.name.toLowerCase().includes(searchQuery) || f.algorithm.toLowerCase().includes(searchQuery));
  }

  // Type filter
  if (typeFilter !== 'all') {
    files = files.filter(f => f.type === typeFilter);
  }

  // Status filter (Secured / Accessible)
  if (statusFilter !== 'all') {
    if (statusFilter === 'secured' || statusFilter === 'encrypted') {
      files = files.filter(f => f.status.toLowerCase() === 'secured' || f.status.toLowerCase() === 'encrypted');
    } else if (statusFilter === 'accessible' || statusFilter === 'decrypted') {
      files = files.filter(f => f.status.toLowerCase() === 'accessible' || f.status.toLowerCase() === 'decrypted');
    } else {
      files = files.filter(f => f.status.toLowerCase() === statusFilter.toLowerCase());
    }
  }

  // Sorting
  files.sort((a, b) => {
    switch (sortOption) {
      case 'name-asc': return a.name.localeCompare(b.name);
      case 'name-desc': return b.name.localeCompare(a.name);
      case 'size-asc': return (a.sizeBytes || 0) - (b.sizeBytes || 0);
      case 'size-desc': return (b.sizeBytes || 0) - (a.sizeBytes || 0);
      case 'date-asc': return new Date(a.date) - new Date(b.date);
      case 'date-desc':
      default: return new Date(b.date) - new Date(a.date);
    }
  });

  return files;
}

function renderFiles() {
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
    if (emptyState) emptyState.style.display = 'block';
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
              <span class="file-sub-text">SHA-256: ${file.sha256 ? file.sha256.substring(0, 16) + '...' : 'N/A'}</span>
            </div>
          </div>
        </td>
        <td><span class="badge badge-neutral">${file.type.toUpperCase()}</span></td>
        <td>${file.sizeStr}</td>
        <td>${file.date}</td>
        <td>${statusBadge}</td>
        <td>
          <div class="d-flex align-items-center gap-1">
            <a href="file-details.html?id=${file.id}" class="btn btn-secondary btn-sm btn-icon" title="File Details">
              <i class="bi bi-eye"></i>
            </a>
            ${isSecured 
              ? `<a href="decrypt.html?id=${file.id}" class="btn btn-outline-primary btn-sm btn-icon" title="Make Accessible">
                   <i class="bi bi-unlock"></i>
                 </a>` 
              : `<button class="btn btn-secondary btn-sm btn-icon" onclick="downloadSimulatedFile('${escapeHTML(file.name)}', '${escapeHTML(file.accessibleSample || file.decryptedSample)}')" title="Download">
                   <i class="bi bi-download"></i>
                 </button>`
            }
            <button class="btn btn-secondary btn-sm btn-icon" onclick="openShareModalForFile('${file.id}')" title="Share">
              <i class="bi bi-share"></i>
            </button>
            <button class="btn btn-outline-danger btn-sm btn-icon" onclick="confirmDeleteFile('${file.id}', '${escapeHTML(file.name)}')" title="Delete">
              <i class="bi bi-trash"></i>
            </button>
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
    const statusBadge = isSecured
      ? `<span class="badge badge-primary"><i class="bi bi-lock-fill"></i> Secured (${file.algorithm})</span>`
      : `<span class="badge badge-success"><i class="bi bi-unlock-fill"></i> Accessible</span>`;

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
            <span>${file.sizeStr}</span> &bull; <span>${file.date}</span>
          </div>
        </div>
        <div class="file-card-footer">
          <span class="badge badge-neutral">${file.type.toUpperCase()}</span>
          <div class="file-card-actions">
            <a href="file-details.html?id=${file.id}" class="btn btn-secondary btn-sm btn-icon" title="Details">
              <i class="bi bi-eye"></i>
            </a>
            ${isSecured
              ? `<a href="decrypt.html?id=${file.id}" class="btn btn-outline-primary btn-sm btn-icon" title="Make Accessible">
                   <i class="bi bi-unlock"></i>
                 </a>`
              : `<button class="btn btn-secondary btn-sm btn-icon" onclick="downloadSimulatedFile('${escapeHTML(file.name)}', '${escapeHTML(file.accessibleSample || file.decryptedSample)}')" title="Download">
                   <i class="bi bi-download"></i>
                 </button>`
            }
            <button class="btn btn-secondary btn-sm btn-icon" onclick="openShareModalForFile('${file.id}')" title="Share">
              <i class="bi bi-share"></i>
            </button>
            <button class="btn btn-outline-danger btn-sm btn-icon" onclick="confirmDeleteFile('${file.id}', '${escapeHTML(file.name)}')" title="Delete">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderPagination(totalItems, totalPages) {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);

  const infoElem = document.getElementById('pagination-info');
  if (infoElem) {
    infoElem.textContent = `Showing ${startItem} to ${endItem} of ${totalItems} files`;
  }

  const pagesContainer = document.getElementById('pagination-pages-list');
  if (!pagesContainer) return;

  let pagesHtml = '';
  // Prev button
  pagesHtml += `
    <button class="btn-page" ${currentPage === 1 ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''} onclick="goToPage(${currentPage - 1})">
      <i class="bi bi-chevron-left"></i>
    </button>
  `;

  for (let i = 1; i <= totalPages; i++) {
    pagesHtml += `
      <button class="btn-page ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>
    `;
  }

  // Next button
  pagesHtml += `
    <button class="btn-page" ${currentPage === totalPages ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''} onclick="goToPage(${currentPage + 1})">
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
 * Delete File Flow & Modal
 */
function initDeleteModal() {
  const confirmBtn = document.getElementById('btn-confirm-delete');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      if (!filePendingDeleteId) return;

      StorageService.deleteFile(filePendingDeleteId);
      closeModal('modal-delete-file');
      showToast('File Shredded', 'The secured file has been permanently deleted from storage.', 'success');
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

  // Set default expiry date to 7 days from now
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
