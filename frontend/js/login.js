'use strict';

// ── Config ────────────────────────────────────────────────
const API_BASE = 'http://localhost:3000/api';

// ── DOM references ────────────────────────────────────────
const form        = document.getElementById('loginForm');
const submitBtn   = document.getElementById('submitBtn');
const alertBox    = document.getElementById('alertBox');
const emailInput  = document.getElementById('email');
const passInput   = document.getElementById('password');
const togglePass  = document.getElementById('togglePass');

// ── Show / hide password ──────────────────────────────────
togglePass.addEventListener('click', () => {
  const show = passInput.type === 'password';
  passInput.type  = show ? 'text' : 'password';
  togglePass.innerHTML = show ? eyeOffSVG() : eyeSVG();
});

// ── Validation helpers ────────────────────────────────────
function setError(id, msg) {
  const input = document.getElementById(id);
  const err   = document.getElementById(id + 'Error');
  if (input) input.classList.add('is-error');
  if (err)   err.textContent = msg;
}

function clearField(id) {
  const input = document.getElementById(id);
  const err   = document.getElementById(id + 'Error');
  if (input) { input.classList.remove('is-error', 'is-valid'); }
  if (err)   err.textContent = '';
}

function showAlert(type, msg) {
  const icon = type === 'error' ? errorSVG() : successSVG();
  alertBox.innerHTML     = `${icon}<span>${msg}</span>`;
  alertBox.className     = `alert alert-${type}`;
  alertBox.style.display = 'flex';
}

function hideAlert() { alertBox.style.display = 'none'; }

// ── Live blur validation ──────────────────────────────────
emailInput.addEventListener('blur', () => {
  const v = emailInput.value.trim();
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!v)          setError('email', 'Email is required.');
  else if (!re.test(v)) setError('email', 'Enter a valid email address.');
  else { clearField('email'); emailInput.classList.add('is-valid'); }
});

passInput.addEventListener('blur', () => {
  if (!passInput.value) setError('password', 'Password is required.');
  else clearField('password');
});

// ── Form submit ───────────────────────────────────────────
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideAlert();
  clearField('email');
  clearField('password');

  const email    = emailInput.value.trim();
  const password = passInput.value;

  // Client-side validation
  let valid = true;
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email)             { setError('email',    'Email is required.');                 valid = false; }
  else if (!emailRe.test(email)) { setError('email', 'Enter a valid email address.');  valid = false; }
  if (!password)          { setError('password', 'Password is required.');              valid = false; }
  if (!valid) return;

  setLoading(true);

  try {
    const res  = await fetch(`${API_BASE}/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (res.ok && data.success) {
      // Store JWT and user info
      localStorage.setItem('sr_token', data.token);
      localStorage.setItem('sr_user',  JSON.stringify(data.user));

      showAlert('success', `Welcome back, ${data.user.full_name}! Redirecting…`);

      setTimeout(() => {
        if (data.user.role === 'ADMIN') {
          window.location.href = 'admin-dashboard.html';
        } else {
          window.location.href = 'user-dashboard.html';
        }
      }, 1200);
    } else if (res.status === 422 && data.errors) {
      const map = { email: 'email', password: 'password' };
      Object.entries(data.errors).forEach(([f, m]) => setError(map[f] || f, m));
    } else {
      showAlert('error', data.message || 'Invalid email or password.');
      // Shake the card for incorrect credentials
      document.querySelector('.auth-card').classList.add('shake');
      setTimeout(() => document.querySelector('.auth-card').classList.remove('shake'), 600);
    }
  } catch (err) {
    console.error(err);
    showAlert('error', 'Cannot reach the server. Make sure the backend is running.');
  } finally {
    setLoading(false);
  }
});

function setLoading(on) {
  submitBtn.disabled  = on;
  submitBtn.innerHTML = on
    ? `<span class="btn-spinner"></span>Signing in…`
    : 'Sign In';
}

// ── SVG helpers ───────────────────────────────────────────
function eyeSVG() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
}
function eyeOffSVG() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/></svg>`;
}
function errorSVG() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
}
function successSVG() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
}
