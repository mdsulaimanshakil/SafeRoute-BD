'use strict';

// ── Config ────────────────────────────────────────────────
const API_BASE = 'http://localhost:3000/api';

// ── DOM references ────────────────────────────────────────
const form         = document.getElementById('registerForm');
const submitBtn    = document.getElementById('submitBtn');
const alertBox     = document.getElementById('alertBox');
const passwordInput = document.getElementById('password');
const confirmInput  = document.getElementById('confirmPassword');
const togglePass    = document.getElementById('togglePass');
const toggleConfirm = document.getElementById('toggleConfirm');
const strengthBars  = document.querySelectorAll('.strength-bar span');
const strengthLabel = document.getElementById('strengthLabel');

// ── Password toggle ───────────────────────────────────────
function setupToggle(btn, input) {
  btn.addEventListener('click', () => {
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.innerHTML = show ? eyeOffSVG() : eyeSVG();
  });
}
setupToggle(togglePass,    passwordInput);
setupToggle(toggleConfirm, confirmInput);

// ── Password strength ─────────────────────────────────────
const strengthLevels = [
  { label: 'Too short',  color: '#FF4D6A', bars: 1 },
  { label: 'Weak',       color: '#FF4D6A', bars: 1 },
  { label: 'Fair',       color: '#F59E0B', bars: 2 },
  { label: 'Good',       color: '#3BB5FD', bars: 3 },
  { label: 'Strong',     color: '#1DBF8A', bars: 4 },
];

function getStrength(pw) {
  if (pw.length < 8)       return 0;
  let score = 1;
  if (/[A-Z]/.test(pw))    score++;
  if (/[0-9]/.test(pw))    score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

passwordInput.addEventListener('input', () => {
  const pw  = passwordInput.value;
  const lvl = getStrength(pw);
  const s   = strengthLevels[Math.min(lvl, strengthLevels.length - 1)];

  strengthBars.forEach((bar, i) => {
    bar.style.background = i < s.bars ? s.color : 'var(--navy-border)';
  });
  strengthLabel.textContent  = pw.length ? s.label : '';
  strengthLabel.style.color  = s.color;
});

// ── Validation helpers ────────────────────────────────────
function setError(fieldId, msg) {
  const input = document.getElementById(fieldId);
  const err   = document.getElementById(fieldId + 'Error');
  if (input) input.classList.add('is-error');
  if (err)   err.textContent = msg;
}

function clearError(fieldId) {
  const input = document.getElementById(fieldId);
  const err   = document.getElementById(fieldId + 'Error');
  if (input) { input.classList.remove('is-error'); input.classList.add('is-valid'); }
  if (err)   err.textContent = '';
}

function clearAll() {
  ['fullName','email','phone','password','confirmPassword','role'].forEach(clearError);
  // remove is-valid too
  document.querySelectorAll('.form-input').forEach(el => el.classList.remove('is-valid', 'is-error'));
}

function showAlert(type, msg) {
  const icon = type === 'error' ? errorSVG() : successSVG();
  alertBox.innerHTML  = `${icon}<span>${msg}</span>`;
  alertBox.className  = `alert alert-${type}`;
  alertBox.style.display = 'flex';
  alertBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideAlert() {
  alertBox.style.display = 'none';
}

// ── Live validation (on blur) ─────────────────────────────
document.getElementById('fullName').addEventListener('blur', () => {
  const v = document.getElementById('fullName').value.trim();
  if (!v) setError('fullName', 'Full name is required.');
  else if (v.length > 100) setError('fullName', 'Must be under 100 characters.');
  else clearError('fullName');
});

document.getElementById('email').addEventListener('blur', () => {
  const v = document.getElementById('email').value.trim();
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!v) setError('email', 'Email is required.');
  else if (!re.test(v)) setError('email', 'Enter a valid email address.');
  else clearError('email');
});

document.getElementById('phone').addEventListener('blur', () => {
  const v = document.getElementById('phone').value.trim();
  const re = /^[0-9+\-\s()]{7,20}$/;
  if (!v) setError('phone', 'Phone number is required.');
  else if (!re.test(v)) setError('phone', 'Enter a valid phone number.');
  else clearError('phone');
});

passwordInput.addEventListener('blur', () => {
  const v = passwordInput.value;
  if (!v) setError('password', 'Password is required.');
  else if (v.length < 8) setError('password', 'Password must be at least 8 characters.');
  else clearError('password');
});

confirmInput.addEventListener('input', () => {
  if (confirmInput.value && confirmInput.value !== passwordInput.value) {
    setError('confirmPassword', 'Passwords do not match.');
  } else if (confirmInput.value) {
    clearError('confirmPassword');
  }
});

document.getElementById('role').addEventListener('change', () => {
  const v = document.getElementById('role').value;
  if (!v) setError('role', 'Please select a role.');
  else clearError('role');
});

// ── Form submit ───────────────────────────────────────────
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAll();
  hideAlert();

  const fullName       = document.getElementById('fullName').value.trim();
  const email          = document.getElementById('email').value.trim();
  const phone          = document.getElementById('phone').value.trim();
  const password       = passwordInput.value;
  const confirmPassword = confirmInput.value;
  const role           = document.getElementById('role').value;

  // Client-side validation
  let valid = true;
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRe = /^[0-9+\-\s()]{7,20}$/;

  if (!fullName)            { setError('fullName', 'Full name is required.');           valid = false; }
  if (!email)               { setError('email',    'Email is required.');                valid = false; }
  else if (!emailRe.test(email)) { setError('email', 'Enter a valid email address.');   valid = false; }
  if (!phone)               { setError('phone', 'Phone number is required.');            valid = false; }
  else if (!phoneRe.test(phone)) { setError('phone', 'Enter a valid phone number.');    valid = false; }
  if (!password)            { setError('password', 'Password is required.');             valid = false; }
  else if (password.length < 8)  { setError('password', 'Minimum 8 characters.');       valid = false; }
  if (!confirmPassword)     { setError('confirmPassword', 'Please confirm your password.'); valid = false; }
  else if (password !== confirmPassword) { setError('confirmPassword', 'Passwords do not match.'); valid = false; }
  if (!role)                { setError('role', 'Please select a role.');                 valid = false; }

  if (!valid) return;

  // Submit to backend
  setLoading(true);

  try {
    const res  = await fetch(`${API_BASE}/auth/register`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ full_name: fullName, email, phone, password, role }),
    });
    const data = await res.json();

    if (res.ok && data.success) {
      showAlert('success', '🎉 Account created! Redirecting to login…');
      form.reset();
      document.querySelectorAll('.form-input').forEach(el => el.classList.remove('is-valid'));
      setTimeout(() => { window.location.href = 'login.html'; }, 1800);
    } else if (res.status === 422 && data.errors) {
      // Server-side field errors
      Object.entries(data.errors).forEach(([field, msg]) => {
        const map = { full_name: 'fullName', email: 'email', phone: 'phone', password: 'password', role: 'role' };
        setError(map[field] || field, msg);
      });
    } else {
      showAlert('error', data.message || 'Registration failed. Please try again.');
    }
  } catch (err) {
    console.error(err);
    showAlert('error', 'Cannot reach the server. Make sure the backend is running.');
  } finally {
    setLoading(false);
  }
});

function setLoading(on) {
  submitBtn.disabled   = on;
  submitBtn.innerHTML  = on
    ? `<span class="btn-spinner"></span>Creating account…`
    : 'Create Account';
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
