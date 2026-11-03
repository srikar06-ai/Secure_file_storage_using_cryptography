/**
 * SECUREVAULT - Authentication Module
 * Login, Signup, Validation, Password Strength, and Show/Hide Controls
 */

document.addEventListener('DOMContentLoaded', () => {
  initPasswordToggles();
  initLoginForm();
  initSignupForm();
  initForgotPasswordModal();
});

/**
 * Toggle Password Visibility (Eye Icon)
 */
function initPasswordToggles() {
  document.querySelectorAll('.btn-toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      const icon = btn.querySelector('i');

      if (!input) return;

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
  });
}

/**
 * Login Form Validation & Handling
 */
function initLoginForm() {
  const form = document.getElementById('login-form');
  if (!form) return;

  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  const rememberCheckbox = document.getElementById('login-remember');

  // Fill demo credentials button
  const fillDemoBtn = document.getElementById('btn-fill-demo');
  if (fillDemoBtn && emailInput && passwordInput) {
    fillDemoBtn.addEventListener('click', (e) => {
      e.preventDefault();
      emailInput.value = 'alex.rivera@securevault.io';
      passwordInput.value = 'CipherVault#2024';
      clearInvalid(emailInput);
      clearInvalid(passwordInput);
      showToast('Demo Credentials Filled', 'Click "Sign In" to access the vault.', 'info');
    });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let isValid = true;

    // Validate Email
    if (!validateEmail(emailInput.value)) {
      setInvalid(emailInput, 'Please enter a valid email address.');
      isValid = false;
    } else {
      clearInvalid(emailInput);
    }

    // Validate Password
    if (!passwordInput.value || passwordInput.value.length < 6) {
      setInvalid(passwordInput, 'Password must be at least 6 characters.');
      isValid = false;
    } else {
      clearInvalid(passwordInput);
    }

    if (!isValid) return;

    // Authenticate via Backend API with graceful offline fallback
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Authenticating...';

    (async () => {
      try {
        if (typeof ApiService !== 'undefined') {
          const res = await ApiService.login(emailInput.value.trim(), passwordInput.value);
          if (res && res.data && res.data.token) {
            showToast('Authentication Successful', `Welcome back, ${res.data.user.name || 'User'}!`, 'success');
            setTimeout(() => { window.location.href = 'dashboard.html'; }, 600);
            return;
          }
        }
      } catch (err) {
        console.warn('Backend login warning:', err);
        if (err.status && err.status < 500) {
          showToast('Authentication Failed', err.message || 'Invalid email or password.', 'error');
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalText;
          return;
        }
      }

      if (typeof StorageService !== 'undefined') {
        StorageService.addLog('User Login', 'All Activities', 'N/A', 'Success', `User logged in: ${emailInput.value}`);
      }
      showToast('Authentication Successful', 'Welcome back to SecureVault!', 'success');
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 700);
    })();
  });
}

/**
 * Signup Form Validation & Handling
 */
function initSignupForm() {
  const form = document.getElementById('signup-form');
  if (!form) return;

  const nameInput = document.getElementById('signup-name');
  const emailInput = document.getElementById('signup-email');
  const passwordInput = document.getElementById('signup-password');
  const confirmInput = document.getElementById('signup-confirm-password');
  const termsCheckbox = document.getElementById('signup-terms');

  // Dynamic password strength meter
  if (passwordInput) {
    passwordInput.addEventListener('input', () => {
      updatePasswordStrength(passwordInput.value);
    });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let isValid = true;

    // Name
    if (!nameInput.value.trim() || nameInput.value.trim().length < 2) {
      setInvalid(nameInput, 'Please enter your full name.');
      isValid = false;
    } else {
      clearInvalid(nameInput);
    }

    // Email
    if (!validateEmail(emailInput.value)) {
      setInvalid(emailInput, 'Please enter a valid email address.');
      isValid = false;
    } else {
      clearInvalid(emailInput);
    }

    // Password
    const strength = calculatePasswordStrength(passwordInput.value);
    if (strength.score < 2) {
      setInvalid(passwordInput, 'Password is too weak. Include upper, lower, numbers, or symbols.');
      isValid = false;
    } else {
      clearInvalid(passwordInput);
    }

    // Confirm Password
    if (passwordInput.value !== confirmInput.value) {
      setInvalid(confirmInput, 'Passwords do not match.');
      isValid = false;
    } else {
      clearInvalid(confirmInput);
    }

    // Terms
    if (!termsCheckbox.checked) {
      showToast('Terms Required', 'You must agree to the Terms of Service to create an account.', 'warning');
      isValid = false;
    }

    if (!isValid) return;

    // Provision account via Backend API with graceful offline fallback
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Initializing Security Keys...';

    (async () => {
      try {
        if (typeof ApiService !== 'undefined') {
          const res = await ApiService.register(nameInput.value.trim(), emailInput.value.trim(), passwordInput.value);
          if (res && res.data && res.data.token) {
            ApiService.setSession(res.data.token, res.data.user);
            showToast('Account Created', 'Vault registered on backend! Redirecting...', 'success');
            setTimeout(() => { window.location.href = 'dashboard.html'; }, 700);
            return;
          }
        }
      } catch (err) {
        console.warn('Backend register warning:', err);
        if (err.status && err.status < 500) {
          showToast('Registration Error', err.message || 'Registration failed.', 'error');
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalText;
          return;
        }
      }

      if (typeof StorageService !== 'undefined') {
        const user = StorageService.getUser();
        user.name = nameInput.value.trim();
        user.email = emailInput.value.trim();
        user.avatarInitials = nameInput.value.trim().split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        StorageService.saveUser(user);
        StorageService.addLog('Account Created', 'All Activities', 'N/A', 'Success', `New zero-knowledge vault provisioned for ${user.email}`);
      }
      showToast('Account Created', 'Vault keys initialized! Redirecting to dashboard...', 'success');
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 900);
    })();
  });
}

/**
 * Forgot Password Flow
 */
function initForgotPasswordModal() {
  const form = document.getElementById('forgot-password-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value;
    if (!validateEmail(email)) {
      showToast('Invalid Email', 'Please enter a valid email address.', 'error');
      return;
    }

    closeModal('modal-forgot-password');
    showToast('Reset Link Dispatched', `Cryptographic recovery link sent to ${email}`, 'success');
  });
}

/**
 * Helpers
 */
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

function setInvalid(input, message) {
  input.classList.add('is-invalid');
  const feedback = input.parentElement.parentElement.querySelector('.invalid-feedback') || input.parentElement.querySelector('.invalid-feedback');
  if (feedback) feedback.textContent = message;
}

function clearInvalid(input) {
  input.classList.remove('is-invalid');
}

function calculatePasswordStrength(pass) {
  let score = 0;
  if (!pass) return { score: 0, text: 'None', className: '' };
  if (pass.length >= 8) score += 1;
  if (pass.length >= 12) score += 1;
  if (/[A-Z]/.test(pass)) score += 1;
  if (/[0-9]/.test(pass)) score += 1;
  if (/[^A-Za-z0-9]/.test(pass)) score += 1;

  if (score <= 1) return { score: 1, text: 'Weak', className: 'weak' };
  if (score === 2) return { score: 2, text: 'Fair', className: 'fair' };
  if (score === 3 || score === 4) return { score: 3, text: 'Good', className: 'good' };
  return { score: 4, text: 'Strong', className: 'strong' };
}

function updatePasswordStrength(pass) {
  const result = calculatePasswordStrength(pass);
  const bars = document.querySelectorAll('.strength-bar');
  const label = document.getElementById('strength-label');

  if (!bars.length || !label) return;

  label.textContent = result.text;
  label.className = `strength-val ${result.className}`;

  bars.forEach((bar, idx) => {
    if (idx < result.score) {
      if (result.score === 1) bar.style.backgroundColor = '#DC2626';
      else if (result.score === 2) bar.style.backgroundColor = '#D97706';
      else if (result.score === 3) bar.style.backgroundColor = '#2563EB';
      else bar.style.backgroundColor = '#16A34A';
    } else {
      bar.style.backgroundColor = '#E4E7EC';
    }
  });
}
