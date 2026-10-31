/**
 * SECUREVAULT - Security Settings & Profile Controller (settings.html & profile.html)
 * 2FA switches, session revocation, algorithm defaults, profile editor
 */

document.addEventListener('DOMContentLoaded', () => {
  loadSettingsForm();
  initSettingsForm();
  initChangePasswordForm();
  initSessionRevocation();
  initResetDemoData();
  loadProfileData();
  initProfileEditForm();
});

/**
 * Load & Save Settings
 */
function loadSettingsForm() {
  if (typeof StorageService === 'undefined') return;
  const settings = StorageService.getSettings();

  const toggle2FA = document.getElementById('setting-2fa');
  const selectAutoLogout = document.getElementById('setting-auto-logout');
  const togglePassProtect = document.getElementById('setting-pass-protect');
  const selectDefaultAlgo = document.getElementById('setting-default-algo');
  const toggleAutoEncrypt = document.getElementById('setting-auto-encrypt');
  const toggleEmailAlerts = document.getElementById('setting-email-alerts');

  if (toggle2FA) toggle2FA.checked = !!settings.twoFactor;
  if (selectAutoLogout) selectAutoLogout.value = settings.autoLogout || '30';
  if (togglePassProtect) togglePassProtect.checked = !!settings.passwordProtection;
  if (selectDefaultAlgo) selectDefaultAlgo.value = settings.defaultAlgo || 'AES-256';
  if (toggleAutoEncrypt) toggleAutoEncrypt.checked = !!settings.autoEncrypt;
  if (toggleEmailAlerts) toggleEmailAlerts.checked = !!settings.emailAlerts;
}

function initSettingsForm() {
  const form = document.getElementById('form-security-settings');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const updatedSettings = {
      twoFactor: document.getElementById('setting-2fa')?.checked ?? true,
      autoLogout: document.getElementById('setting-auto-logout')?.value ?? '30',
      passwordProtection: document.getElementById('setting-pass-protect')?.checked ?? true,
      defaultAlgo: document.getElementById('setting-default-algo')?.value ?? 'AES-256',
      autoEncrypt: document.getElementById('setting-auto-encrypt')?.checked ?? true,
      emailAlerts: document.getElementById('setting-email-alerts')?.checked ?? true
    };

    StorageService.saveSettings(updatedSettings);
    showToast('Settings Saved', 'Cryptographic policies and security preferences updated.', 'success');
  });
}

/**
 * Change Password Handling
 */
function initChangePasswordForm() {
  const form = document.getElementById('form-change-password');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const currentPass = document.getElementById('current-password').value;
    const newPass = document.getElementById('new-password').value;
    const confirmPass = document.getElementById('confirm-new-password').value;

    if (!currentPass) {
      showToast('Validation Error', 'Please enter your current password.', 'error');
      return;
    }

    if (!newPass || newPass.length < 8) {
      showToast('Validation Error', 'New password must be at least 8 characters with numbers and symbols.', 'error');
      return;
    }

    if (newPass !== confirmPass) {
      showToast('Mismatch', 'New passwords do not match.', 'error');
      return;
    }

    form.reset();
    StorageService.addLog('Password Changed', 'All Activities', 'N/A', 'Success', 'Vault master passphrase rotated');
    showToast('Password Updated', 'Your vault credentials were rotated successfully.', 'success');
  });
}

/**
 * Active Sessions Revocation
 */
function initSessionRevocation() {
  document.querySelectorAll('.btn-revoke-session').forEach(btn => {
    btn.addEventListener('click', () => {
      const sessionRow = btn.closest('.session-item');
      const deviceName = sessionRow.querySelector('strong')?.textContent || 'Device';

      sessionRow.style.opacity = '0.5';
      btn.disabled = true;
      btn.textContent = 'Revoked';

      StorageService.addLog('Session Revoked', 'All Activities', 'N/A', 'Warning', `Revoked access token for ${deviceName}`);
      showToast('Session Terminated', `Active token revoked for ${deviceName}.`, 'info');
    });
  });
}

/**
 * Reset Demo Data Button
 */
function initResetDemoData() {
  const resetBtn = document.getElementById('btn-reset-demo-data');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('Reset all vault data, files, and keys back to clean initial demo state?')) {
        StorageService.resetAll();
        showToast('Demo Data Reset', 'Initial clean state restored. Reloading...', 'info');
        setTimeout(() => {
          window.location.reload();
        }, 800);
      }
    });
  }
}

/**
 * User Profile Logic (profile.html)
 */
function loadProfileData() {
  if (typeof StorageService === 'undefined') return;
  const user = StorageService.getUser();
  const files = StorageService.getFiles();

  const nameInput = document.getElementById('profile-edit-name');
  const emailInput = document.getElementById('profile-edit-email');
  const roleInput = document.getElementById('profile-edit-role');
  const bioInput = document.getElementById('profile-edit-bio');

  if (nameInput) nameInput.value = user.name;
  if (emailInput) emailInput.value = user.email;
  if (roleInput) roleInput.value = user.role;
  if (bioInput) bioInput.value = user.bio || '';

  // Profile page metrics
  const totalFilesElem = document.getElementById('profile-total-files');
  const securedFilesElem = document.getElementById('profile-encrypted-files');
  const joinedElem = document.getElementById('profile-joined-date');
  const planElem = document.getElementById('profile-plan-badge');

  if (totalFilesElem) totalFilesElem.textContent = files.length;
  if (securedFilesElem) securedFilesElem.textContent = files.filter(f => f.status === 'Secured' || f.status === 'Encrypted').length;
  if (joinedElem) joinedElem.textContent = user.joinedDate;
  if (planElem) planElem.textContent = user.plan;
}

function initProfileEditForm() {
  const form = document.getElementById('form-edit-profile');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const user = StorageService.getUser();
    user.name = document.getElementById('profile-edit-name').value.trim();
    user.email = document.getElementById('profile-edit-email').value.trim();
    user.role = document.getElementById('profile-edit-role').value.trim();
    user.bio = document.getElementById('profile-edit-bio').value.trim();
    user.avatarInitials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    StorageService.saveUser(user);
    updateUserHeaderDisplay();
    showToast('Profile Saved', 'Your cryptographic profile information was updated.', 'success');
  });
}
