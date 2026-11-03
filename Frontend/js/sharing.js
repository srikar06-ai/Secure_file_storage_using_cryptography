/**
 * SECUREVAULT - File Sharing Controller (shared-files.html)
 * Share links generator, Permissions management, Expiry tracking, Revoke Access
 */

let shareToRevokeId = null;

document.addEventListener('DOMContentLoaded', () => {
  renderSharedFiles();
  initShareModal();
  initRevokeModal();
  initFileSelectDropdown();
});

function renderSharedFiles() {
  const tbody = document.getElementById('shared-table-tbody');
  if (!tbody || typeof StorageService === 'undefined') return;

  const shares = StorageService.getShared();

  if (shares.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-4 text-muted">
          <i class="bi bi-share display-6 d-block mb-2 text-muted"></i>
          No files currently shared. Click "Create Share Link" to share securely.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = shares.map(share => {
    let permBadge = 'badge-neutral';
    if (share.permission === 'Full Access') permBadge = 'badge-primary';
    else if (share.permission === 'Download') permBadge = 'badge-success';

    const statusBadge = share.status === 'Active'
      ? `<span class="badge badge-success"><i class="bi bi-check-circle-fill"></i> Active</span>`
      : share.status === 'Revoked'
      ? `<span class="badge badge-danger"><i class="bi bi-x-circle-fill"></i> Revoked</span>`
      : `<span class="badge badge-warning"><i class="bi bi-clock-history"></i> Expired</span>`;

    return `
      <tr>
        <td>
          <div class="d-flex align-items-center gap-2">
            <i class="bi bi-file-earmark-lock text-primary-color" style="font-size: 1.25rem;"></i>
            <strong>${escapeHTML(share.fileName)}</strong>
          </div>
        </td>
        <td>${escapeHTML(share.sharedWith)}</td>
        <td><span class="badge ${permBadge}">${share.permission}</span></td>
        <td>${share.sharedDate}</td>
        <td>${share.expiryDate}</td>
        <td>${statusBadge}</td>
        <td>
          <div class="d-flex align-items-center gap-1">
            <button class="btn btn-secondary btn-sm" onclick="copyShareLink('${share.shareLink}')" title="Copy Link">
              <i class="bi bi-link-45deg"></i> Copy Link
            </button>
            ${share.status === 'Active' ? `
              <button class="btn btn-outline-danger btn-sm" onclick="confirmRevokeShare('${share.id}', '${escapeHTML(share.fileName)}', '${escapeHTML(share.sharedWith)}')" title="Revoke Access">
                <i class="bi bi-shield-x"></i> Revoke
              </button>
            ` : `
              <span class="text-muted small ps-2">Inactive</span>
            `}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function initFileSelectDropdown() {
  const select = document.getElementById('share-file-select');
  if (!select || typeof StorageService === 'undefined') return;

  const files = StorageService.getFiles();
  select.innerHTML = '<option value="">-- Choose a vault file to share --</option>' +
    files.map(f => `<option value="${f.id}">${escapeHTML(f.name)} (${f.sizeStr})</option>`).join('');

  // Check URL parameters for pre-selected share
  const urlParams = new URLSearchParams(window.location.search);
  const shareFileId = urlParams.get('shareFileId');
  if (shareFileId) {
    select.value = shareFileId;
    openModal('modal-share-file');
  }
}

function initShareModal() {
  const form = document.getElementById('form-create-share');
  if (!form) return;

  // Set default expiry to 7 days ahead
  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 7);
  const expiryInput = document.getElementById('share-expiry-date');
  if (expiryInput) expiryInput.value = defaultDate.toISOString().split('T')[0];

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fileId = document.getElementById('share-file-select').value;
    const email = document.getElementById('share-recipient-email').value.trim();
    const permission = document.getElementById('share-permission-select').value;
    const expiry = document.getElementById('share-expiry-date').value;

    if (!fileId) {
      showToast('Select File', 'Please select a file to share.', 'warning');
      return;
    }

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
    closeModal('modal-share-file');
    form.reset();
    renderSharedFiles();
    showToast('Secure Share Link Created', `Access granted for ${email}`, 'success');
  });
}

function copyShareLink(link) {
  copyToClipboard(link, 'Secure end-to-end share link copied to clipboard!');
}

function confirmRevokeShare(id, fileName, recipient) {
  shareToRevokeId = id;
  const modalText = document.getElementById('revoke-target-text');
  if (modalText) {
    modalText.innerHTML = `Are you sure you want to revoke access to <strong>${escapeHTML(fileName)}</strong> for <strong>${escapeHTML(recipient)}</strong>?`;
  }
  openModal('modal-revoke-share');
}

function initRevokeModal() {
  const confirmBtn = document.getElementById('btn-confirm-revoke');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      if (!shareToRevokeId) return;

      StorageService.revokeShared(shareToRevokeId);
      closeModal('modal-revoke-share');
      renderSharedFiles();
      showToast('Access Revoked', 'The recipient can no longer access or download this file.', 'warning');
      shareToRevokeId = null;
    });
  }
}
