'use strict';

const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db       = require('../config/db');

const router = express.Router();
const SALT_ROUNDS = 12;

// ──────────────────────────────────────────────────────────
//  Validation rule sets
// ──────────────────────────────────────────────────────────
const registerRules = [
  body('full_name')
    .trim().notEmpty().withMessage('Full name is required.')
    .isLength({ max: 100 }).withMessage('Full name must be ≤ 100 characters.'),

  body('email')
    .trim().notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please enter a valid email address.')
    .normalizeEmail(),

  body('phone')
    .trim().notEmpty().withMessage('Phone number is required.')
    .matches(/^[0-9+\-\s()]{7,20}$/).withMessage('Please enter a valid phone number.'),

  body('password')
    .notEmpty().withMessage('Password is required.')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),

  body('role')
    .notEmpty().withMessage('Role is required.')
    .isIn(['PUBLIC_USER', 'ADMIN']).withMessage('Invalid role selected.'),
];

const loginRules = [
  body('email').trim().notEmpty().withMessage('Email is required.').isEmail().normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required.'),
];

// ──────────────────────────────────────────────────────────
//  Helper — format express-validator errors into a map
// ──────────────────────────────────────────────────────────
function formatErrors(errors) {
  return errors.array().reduce((acc, e) => {
    if (!acc[e.path]) acc[e.path] = e.msg;
    return acc;
  }, {});
}

// ──────────────────────────────────────────────────────────
//  POST /api/auth/register
// ──────────────────────────────────────────────────────────
router.post('/register', registerRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: formatErrors(errors) });
  }

  const { full_name, email, phone, password, role } = req.body;

  try {
    // 1. Check email uniqueness
    const existing = await db.execute(
      `SELECT user_id FROM USERS WHERE email = :email`,
      { email }
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        errors: { email: 'An account with this email already exists.' },
      });
    }

    // 2. Hash password
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    // 3. Insert user (user_id filled by TRIGGER)
    await db.execute(
      `INSERT INTO USERS (full_name, email, phone, password_hash, role)
       VALUES (:full_name, :email, :phone, :password_hash, :role)`,
      { full_name, email, phone, password_hash, role }
    );

    return res.status(201).json({
      success: true,
      message: 'Account created successfully! Redirecting to login…',
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// ──────────────────────────────────────────────────────────
//  POST /api/auth/login
// ──────────────────────────────────────────────────────────
router.post('/login', loginRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: formatErrors(errors) });
  }

  const { email, password } = req.body;

  try {
    // 1. Find user by email
    const result = await db.execute(
      `SELECT user_id, full_name, email, password_hash, role
         FROM USERS WHERE email = :email`,
      { email }
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const user = result.rows[0];

    // 2. Compare password
    const passwordMatch = await bcrypt.compare(password, user.PASSWORD_HASH);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // 3. Issue JWT
    const payload = {
      user_id:   user.USER_ID,
      full_name: user.FULL_NAME,
      email:     user.EMAIL,
      role:      user.ROLE,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        user_id:   user.USER_ID,
        full_name: user.FULL_NAME,
        email:     user.EMAIL,
        role:      user.ROLE,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

module.exports = router;
