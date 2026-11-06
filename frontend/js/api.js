/**
 * SECUREVAULT - Centralized API & Service Bridge
 * Module: frontend/js/api.js
 * 
 * Provides unified communication with the Express/MongoDB backend (http://localhost:5000/api),
 * transparently managing JWT authentication headers, error handling, token storage,
 * and seamless fallback to offline/demo storage when backend is unreachable.
 */

const API_CONFIG = {
  BASE_URL: window.API_BASE_URL || 'http://localhost:5000/api',
  TOKEN_KEY: 'sv_jwt_token_v1',
  USER_KEY: 'sv_auth_user_v1',
  IS_BACKEND_AVAILABLE: null // checked dynamically
};

const ApiService = {
  /**
   * Get JWT auth token from localStorage
   */
  getToken() {
    return localStorage.getItem(API_CONFIG.TOKEN_KEY);
  },

  /**
   * Set JWT auth token and user in localStorage
   */
  setSession(token, user) {
    if (token) localStorage.setItem(API_CONFIG.TOKEN_KEY, token);
    if (user) {
      localStorage.setItem(API_CONFIG.USER_KEY, JSON.stringify(user));
      // Keep legacy storage key synced for existing UI scripts
      if (typeof StorageService !== 'undefined') {
        const initials = user.name ? user.name.split(' ').map(n=>n[0]).join('').substring(0, 2).toUpperCase() : 'U';
        StorageService.setUser({
          name: user.name || user.email?.split('@')[0],
          email: user.email,
          role: user.role || 'Cryptographic Engineer',
          avatar: initials,
          avatarInitials: initials
        });
      }
    }
  },

  /**
   * Clear session
   */
  clearSession() {
    localStorage.removeItem(API_CONFIG.TOKEN_KEY);
    localStorage.removeItem(API_CONFIG.USER_KEY);
    if (typeof StorageService !== 'undefined') {
      StorageService.clearAuthSession();
    }
  },

  /**
   * Get authenticated user
   */
  getCurrentUser() {
    const raw = localStorage.getItem(API_CONFIG.USER_KEY);
    if (raw) {
      try { return JSON.parse(raw); } catch (e) { /* ignore */ }
    }
    if (typeof StorageService !== 'undefined') {
      return StorageService.getUser();
    }
    return null;
  },

  /**
   * Check backend server connectivity (tries configured port, then 5001/5000 if needed)
   */
  async checkBackendHealth() {
    const urlsToTry = [
      API_CONFIG.BASE_URL,
      'http://localhost:5001/api',
      'http://localhost:5000/api'
    ];
    for (const baseUrl of urlsToTry) {
      try {
        const res = await fetch(`${baseUrl}/health`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });
        if (res.ok) {
          API_CONFIG.BASE_URL = baseUrl;
          API_CONFIG.IS_BACKEND_AVAILABLE = true;
          return true;
        }
      } catch (err) {
        // try next candidate
      }
    }
    API_CONFIG.IS_BACKEND_AVAILABLE = false;
    return false;
  },

  /**
   * Generic authenticated request wrapper
   */
  async request(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${API_CONFIG.BASE_URL}${endpoint}`;
    const token = this.getToken();

    const headers = {
      'Accept': 'application/json',
      ...(options.headers || {})
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Default Content-Type to JSON if body is string or plain object (not FormData)
    if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
      if (typeof options.body === 'object') {
        options.body = JSON.stringify(options.body);
      }
    }

    try {
      const response = await fetch(url, { ...options, headers });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMsg = data?.message || data?.error || `HTTP error ${response.status}`;
        const err = new Error(errorMsg);
        err.status = response.status;
        err.data = data;
        throw err;
      }

      return data;
    } catch (err) {
      // Re-throw for caller to handle or fallback
      throw err;
    }
  },

  // ─────────────────────────────────────────────────────────────
  // Auth API Endpoints
  // ─────────────────────────────────────────────────────────────
  async register(name, email, password) {
    const cleanUsername = (name || '').trim().replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30) || (email.split('@')[0]);
    return this.request('/auth/register', {
      method: 'POST',
      body: { name, username: cleanUsername, email, password }
    });
  },

  async login(email, password) {
    const res = await this.request('/auth/login', {
      method: 'POST',
      body: { email, password }
    });
    if (res?.data?.token) {
      this.setSession(res.data.token, res.data.user);
    }
    return res;
  },

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch (e) {
      // ignore
    } finally {
      this.clearSession();
    }
  },

  async getMe() {
    return this.request('/auth/me', { method: 'GET' });
  },

  // ─────────────────────────────────────────────────────────────
  // File API Endpoints
  // ─────────────────────────────────────────────────────────────
  async uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    return this.request('/files/upload', {
      method: 'POST',
      body: formData
    });
  },

  async listFiles(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/files?${query}` : '/files';
    return this.request(endpoint, { method: 'GET' });
  },

  async getFileMetadata(fileId) {
    return this.request(`/files/${fileId}`, { method: 'GET' });
  },

  async downloadFile(fileId, filename = 'downloaded_file') {
    const token = this.getToken();
    const url = `${API_CONFIG.BASE_URL}/files/${fileId}/download`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      throw new Error(errData?.message || `Failed to download file (${res.status})`);
    }

    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(downloadUrl);
    a.remove();
    return true;
  },

  async deleteFile(fileId) {
    return this.request(`/files/${fileId}`, { method: 'DELETE' });
  },

  async restoreFile(fileId) {
    return this.request(`/files/${fileId}/restore`, { method: 'POST' });
  },

  async listDeletedFiles(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/files/trash/list?${query}` : '/files/trash/list';
    return this.request(endpoint, { method: 'GET' });
  },

  // ─────────────────────────────────────────────────────────────
  // Share API Endpoints
  // ─────────────────────────────────────────────────────────────
  async createShare(fileId, recipientEmail, permission = 'download', expiresInHours = 24) {
    return this.request('/shares', {
      method: 'POST',
      body: { fileId, recipientEmail, permission, expiresInHours }
    });
  },

  async listSharedWithMe() {
    return this.request('/shares/shared-with-me', { method: 'GET' });
  },

  async verifyShareToken(token) {
    return this.request('/shares/verify', {
      method: 'POST',
      body: { token }
    });
  },

  async revokeShare(shareId) {
    return this.request(`/shares/${shareId}`, { method: 'DELETE' });
  },

  // ─────────────────────────────────────────────────────────────
  // Audit Logs API Endpoints
  // ─────────────────────────────────────────────────────────────
  async getMyLogs(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/audit/me${query ? '?' + query : ''}`, { method: 'GET' });
  },

  async getMySummary() {
    return this.request('/audit/me/summary', { method: 'GET' });
  },

  // ─────────────────────────────────────────────────────────────
  // User Profile Endpoints
  // ─────────────────────────────────────────────────────────────
  async getProfile() {
    return this.request('/users/me', { method: 'GET' });
  },

  async changePassword(currentPassword, newPassword) {
    return this.request('/users/me/password', {
      method: 'PUT',
      body: { currentPassword, newPassword }
    });
  }
};

window.API_CONFIG = API_CONFIG;
window.ApiService = ApiService;
