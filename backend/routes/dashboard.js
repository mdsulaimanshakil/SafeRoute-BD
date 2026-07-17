'use strict';

const express = require('express');
const db      = require('../config/db');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// ──────────────────────────────────────────────────────────
//  GET /api/dashboard/user
//  Protected: PUBLIC_USER only
// ──────────────────────────────────────────────────────────
router.get('/user', authenticate, requireRole('PUBLIC_USER'), async (req, res) => {
  try {
    const result = await db.execute(
      `SELECT full_name, role FROM USERS WHERE user_id = :user_id`,
      { user_id: req.user.user_id }
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const row = result.rows[0];

    return res.status(200).json({
      success:   true,
      full_name: row.FULL_NAME,
      role:      row.ROLE,
      stats: {
        total_incidents: 0,
        pending:         0,
        resolved:        0,
        safety_score:    85,
      },
    });
  } catch (err) {
    console.error('Dashboard /user error:', err);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// ──────────────────────────────────────────────────────────
//  GET /api/dashboard/admin
//  Protected: ADMIN only
// ──────────────────────────────────────────────────────────
router.get('/admin', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const result = await db.execute(
      `SELECT full_name, role FROM USERS WHERE user_id = :user_id`,
      { user_id: req.user.user_id }
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const row = result.rows[0];

    return res.status(200).json({
      success:   true,
      full_name: row.FULL_NAME,
      role:      row.ROLE,
      stats: {
        total_users:       0,
        total_incidents:   0,
        open_incidents:    0,
        resolved_incidents: 0,
      },
    });
  } catch (err) {
    console.error('Dashboard /admin error:', err);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

module.exports = router;
