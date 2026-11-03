/**
 * SECUREVAULT - Global App Controller
 * Toasts, Modals, Navigation, Dropdowns, and UI Helpers
 */

document.addEventListener('DOMContentLoaded', () => {
  initToastsContainer();
  initSidebar();
  initDropdowns();
  initModals();
  initGlobalShortcuts();
  // Enable hitting Enter on inputs to submit or trigger primary button in forms and cards
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'SELECT')) {
        // If inside an explicit form
        const form = activeEl.closest('form');
        if (form) {
          const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
          if (submitBtn) {
            e.preventDefault();
            submitBtn.click();
            return;
          }
        }
        // If inside a card/container without form (e.g., upload or decrypt sections)
        const container = activeEl.closest('.card, .auth-card, .decrypt-box');
        if (container) {
          const primaryBtn = container.querySelector('#btn-start-encrypt, #btn-start-decrypt, .btn-primary:not([disabled])');
          if (primaryBtn && !primaryBtn.disabled) {
            e.preventDefault();
            primaryBtn.click();
            return;
          }
        }
      }
    }
  });
  updateUserHeaderDisplay();
});

/**
 * Toast Notification System
 */
function initToastsContainer() {
  if (!document.getElementById('toast-container')) {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
}

function showToast(title, message, type = 'info', duration = 4000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let iconClass = 'bi-info-circle-fill';
  if (type === 'success') iconClass = 'bi-check-circle-fill';
  if (type === 'error') iconClass = 'bi-x-circle-fill';
  if (type === 'warning') iconClass = 'bi-exclamation-triangle-fill';

  toast.innerHTML = `
    <i class="bi ${iconClass} toast-icon"></i>
    <div class="toast-content">
      <div class="toast-title">${escapeHTML(title)}</div>
      <div class="toast-message">${escapeHTML(message)}</div>
    </div>
    <button class="toast-close" aria-label="Close" onclick="this.parentElement.remove()">
      <i class="bi bi-x"></i>
    </button>
  `;

  container.appendChild(toast);

  if (duration > 0) {
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
}

/**
 * Modal System
 */
function initModals() {
  // Close modals on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const openModal = document.querySelector('.modal-backdrop.show');
      if (openModal) {
        closeModal(openModal.id);
      }
    }
  });

  // Close modals on clicking background backdrop
  document.querySelectorAll('.modal-backdrop').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal(modal.id);
      }
    });
  });
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('show'), 10);
  document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.remove('show');
  setTimeout(() => {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }, 250);
}

/**
 * Mobile Sidebar Controller
 */
function initSidebar() {
  const toggleBtn = document.getElementById('sidebar-toggle-btn');
  const sidebar = document.querySelector('.app-sidebar');
  let overlay = document.querySelector('.sidebar-overlay');

  if (!overlay && sidebar) {
    overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);
  }

  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('show');
      if (overlay) overlay.classList.toggle('active');
    });
  }

  if (overlay && sidebar) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('show');
      overlay.classList.remove('active');
    });
  }

  // Highlight active link based on current path
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.sidebar-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'dashboard.html')) {
      link.classList.add('active');
    }
  });
}

/**
 * Topbar Dropdowns (Profile, Notifications)
 */
function initDropdowns() {
  const notifBtn = document.getElementById('notif-dropdown-btn');
  const notifMenu = document.getElementById('notif-dropdown-menu');

  const profileBtn = document.getElementById('profile-dropdown-btn');
  const profileMenu = document.getElementById('profile-dropdown-menu');

  if (notifBtn && notifMenu) {
    notifBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      notifMenu.classList.toggle('show');
      if (profileMenu) profileMenu.classList.remove('show');
    });
  }

  if (profileBtn && profileMenu) {
    profileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      profileMenu.classList.toggle('show');
      if (notifMenu) notifMenu.classList.remove('show');
    });
  }

  document.addEventListener('click', () => {
    if (notifMenu) notifMenu.classList.remove('show');
    if (profileMenu) profileMenu.classList.remove('show');
  });
}

/**
 * Global Keyboard Shortcuts (e.g. Ctrl + K / Cmd + K)
 */
function initGlobalShortcuts() {
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      const searchInput = document.getElementById('global-search-input');
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    }
  });

  const searchInput = document.getElementById('global-search-input');
  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (query) {
          window.location.href = `my-files.html?search=${encodeURIComponent(query)}`;
        }
      }
    });
  }
}

/**
 * Synchronize User Avatar and Info from Storage
 */
function updateUserHeaderDisplay() {
  if (typeof StorageService === 'undefined') return;
  const user = StorageService.getUser();

  document.querySelectorAll('.user-display-name').forEach(el => el.textContent = user.name);
  document.querySelectorAll('.user-display-email').forEach(el => el.textContent = user.email);
  document.querySelectorAll('.user-display-role').forEach(el => el.textContent = user.role);
  document.querySelectorAll('.user-display-initials').forEach(el => el.textContent = user.avatarInitials || 'AR');
}

/**
 * Clipboard Utility
 */
function copyToClipboard(text, successMessage = 'Copied to clipboard!') {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('Copied', successMessage, 'success');
    }).catch(() => {
      fallbackCopy(text, successMessage);
    });
  } else {
    fallbackCopy(text, successMessage);
  }
}

function fallbackCopy(text, successMessage) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-9999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand('copy');
    showToast('Copied', successMessage, 'success');
  } catch (err) {
    showToast('Copy Failed', 'Unable to copy text to clipboard', 'error');
  }
  document.body.removeChild(textArea);
}

/**
 * HTML Escaping Helper
 */
function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Simulated File Download Helper
 */
function downloadSimulatedFile(filename, content, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Download Started', `Downloading ${filename}`, 'info');
}

/**
 * Format bytes helper
 */
function formatBytes(bytes, decimals = 1) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
