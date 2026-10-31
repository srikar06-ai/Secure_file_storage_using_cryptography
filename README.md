# SecureVault – Securing File Storage Using Cryptography

A complete, modern, responsive frontend web application demonstrating client-side zero-knowledge file securing, accessible restoration, cryptographic key management, secure time-bound file sharing, and activity logging.

![Design System](https://img.shields.io/badge/Design_System-Strict_SaaS_Palette-0000FF.svg)
![Frontend Only](https://img.shields.io/badge/Architecture-Frontend_Only_Vanilla_JS-16A34A.svg)
![Cryptography](https://img.shields.io/badge/Ciphers-AES--256--GCM_|_AES--128_|_RSA--2048-0000FF.svg)

---

## 1. Project Overview

**SecureVault** is built strictly as a client-side frontend web application without any server-side database, backend API, or server credential storage. All cryptographic operations, file containers, cryptographic keys, and activity audits are simulated and preserved in browser state and `localStorage`.

### Strict Color Palette
- **Primary Color:** `#0000FF`
- **Secondary Color:** `#FFFFFF`
- **Background:** `#F8F9FF`
- **Primary Text:** `#101828`
- **Secondary Text:** `#667085`
- **Border:** `#E4E7EC`
- **Success:** `#16A34A`
- **Danger:** `#DC2626`
- **Light Blue:** `#EEF2FF`

---

## 2. All 15 Application Screens

Every required screen has been built and fully cross-linked:

| Screen # | Page File | Purpose & Interactive Features |
| :--- | :--- | :--- |
| **Screen 1** | `index.html` | **Landing Page** with brand logo, hero headline, interactive security graphic, 6 core feature cards, 5-step workflow, and site footer. |
| **Screen 2** | `login.html` | **Authentication Page** with form validation, eye toggle for password visibility, auto-fill demo credentials, and password recovery modal. |
| **Screen 3** | `signup.html` | **Account Creation** with full name, email, dynamic 4-stage entropy strength meter, password confirmation, and terms agreement. |
| **Screen 4** | `dashboard.html` | **SaaS Dashboard** with 4 metric overview cards, quick actions, recent files table, storage category visualizer, and live activity stream. |
| **Screen 5** | `upload.html` | **Upload & Secure File** with drag-and-drop dropzone, algorithm selector (AES-256, AES-128, RSA-2048), CSPRNG mock key generator, and 4-step securing simulation pipeline. |
| **Screen 6** | `my-files.html` | **File Management** featuring real-time search, file type filters, status filters (Secured / Accessible), sorting, List View vs Grid View switch, pagination, and deletion modal. |
| **Screen 7** | `decrypt.html` | **Make Files Accessible Interface** with container selector, demo key injector, multi-stage inverse cipher pipeline animation, and accessible file download. |
| **Screen 8** | `file-details.html` | **File Details & Preview** showing cryptographic hashes (SHA-256, MD5), key fingerprints, ciphertext stream viewer, plaintext accessible preview, and audit trail. |
| **Screen 9** | `shared-files.html` | **Secure File Sharing** with time-bound links, permissions (View Only, Download, Full Access), copy-link feedback, and access revocation. |
| **Screen 10** | `key-management.html` | **Cryptographic Key Management** showing symmetric & asymmetric keys, key generator modal, full key export/inspection, and key safety warning banner. |
| **Screen 11** | `settings.html` | **Security Settings** with 2FA toggle, auto-logout timer, password protection switches, session manager with revoke buttons, and demo reset. |
| **Screen 12** | `activity-logs.html` | **Security Logs & Audit Trail** with category filters (Secured, Accessible, Upload, Sharing), status badges, and CSV export. |
| **Screen 13** | `profile.html` | **User Profile** with avatar badge, storage quota, security clearance, and profile editing. |
| **Screen 14** | `help.html` | **Help & How It Works** explaining Cryptography fundamentals, File securing, AES round mechanics, RSA keypairs, and interactive FAQ accordion. |
| **Screen 15** | `404.html` | **Error & Success States** featuring a Page Not Found view plus an interactive test gallery for Access Denied, Invalid Password, Upload Failed, File Secured, and File Accessible alerts. |

---

## 3. Technology Stack

- **HTML5 & CSS3** (Vanilla, clean semantic markup, CSS Variables, Flexbox, and CSS Grid)
- **Vanilla JavaScript (ES6+)** (Modular architecture, zero framework dependencies)
- **Bootstrap Icons (v1.11.3 CDN)** for consistent vector iconography
- **Inter & JetBrains Mono Fonts** via Google Fonts
- **HTML5 LocalStorage** for persistent mock database operations

---

## 4. File Structure

```
Frontend/
│
├── index.html               # Screen 1: Landing Page
├── login.html               # Screen 2: Login Page
├── signup.html              # Screen 3: Signup Page
├── dashboard.html           # Screen 4: Dashboard
├── upload.html              # Screen 5: Upload & Secure
├── my-files.html            # Screen 6: My Files Management
├── decrypt.html             # Screen 7: Make Files Accessible
├── file-details.html        # Screen 8: File Details & Preview
├── shared-files.html        # Screen 9: Shared Files Management
├── key-management.html      # Screen 10: Key Management
├── settings.html            # Screen 11: Security Settings
├── activity-logs.html       # Screen 12: Security Logs
├── profile.html             # Screen 13: User Profile
├── help.html                # Screen 14: Help & Cryptography Guide
├── 404.html                 # Screen 15: Error & Success UI States
│
├── css/
│   ├── style.css            # Design system, variables, landing styles, modals, toasts
│   ├── auth.css             # Login, signup, password strength styling
│   ├── dashboard.css        # Dashboard shell, sidebar, tables, cards, crypto components
│   └── responsive.css       # Mobile, tablet, laptop, desktop breakpoints
│
├── js/
│   ├── storage.js           # LocalStorage database, seed data, CRUD helpers
│   ├── app.js               # Global UI controller: toasts, modals, mobile menu, search
│   ├── auth.js              # Login & Signup validation, strength meter, demo filler
│   ├── dashboard.js         # Metrics calculations, recent files, activity feed
│   ├── files.js             # My Files search, filter, sort, view toggles, pagination
│   ├── encryption.js        # Upload dropzone, algorithm choices, 4-step securing animation
│   ├── decryption.js        # File selector, demo key injector, accessible file download
│   ├── key-management.js    # Key generation, fingerprinting, key downloads (.key/.pem)
│   ├── sharing.js           # Share link creator, copy link, access revocation
│   └── settings.js          # Security toggles, session revocation, profile editing
│
└── assets/
    ├── icons/               # SVG logo and icons
    └── images/              # Assets directory
```

---

## 5. How to Run the Application

Because SecureVault is built strictly using modern standard web technologies (HTML5, CSS3, Vanilla JS):

1. **Directly in Browser:** Double-click `index.html` or open any `.html` file directly in any modern browser (Chrome, Edge, Firefox, Safari).
2. **Via Local Server (Optional):**
   ```bash
   # Using Python
   python -m http.server 8000

   # Using Node.js npx serve
   npx serve .
   ```
   Then open `http://localhost:8000` in your web browser.

---

## 6. Demo Credentials & Testing Shortcuts

- **Demo Account:** `alex.rivera@securevault.io`
- **Demo Passphrase:** `CipherVault#2024` (or click **"Auto-Fill"** on the Login screen)
- **Access Demo Key:** Click **"Use Demo Key"** on the Accessible Files screen (`decrypt.html`) to test instant access with verified cipher keys.
- **Reset State:** In `settings.html`, click **"Reset Demo State"** at any time to restore fresh mock data.
