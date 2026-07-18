'use strict';

const express = require('express');
const db      = require('../config/db');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// ──────────────────────────────────────────────────────────
//  GET /api/dashboard/user
//  Protected: PUBLIC_USER only
// ──────────────────────────────────────────────────────────
router.get('/user', authenticate, async (req, res) => {
  try {
    const result = await db.execute(
      `SELECT full_name, email, phone, role FROM USERS WHERE user_id = :user_id`,
      { user_id: req.user.user_id }
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const row = result.rows[0];

    // Fetch real stats for this user
    const statsResult = await db.execute(
      `SELECT COUNT(*) AS TOTAL,
              SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS PENDING,
              SUM(CASE WHEN status = 'RESOLVED' THEN 1 ELSE 0 END) AS RESOLVED
         FROM INCIDENT_REPORTS WHERE user_id = :user_id`,
      { user_id: req.user.user_id }
    );
    const s = statsResult.rows[0];

    return res.status(200).json({
      success:   true,
      full_name: row.FULL_NAME,
      email:     row.EMAIL,
      phone:     row.PHONE,
      role:      row.ROLE,
      stats: {
        total_incidents: s.TOTAL || 0,
        pending:         s.PENDING || 0,
        resolved:        s.RESOLVED || 0,
        safety_score:    85,
      },
    });
  } catch (err) {
    console.error('Dashboard /user error:', err.message);
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
      `SELECT full_name, email, role FROM USERS WHERE user_id = :user_id`,
      { user_id: req.user.user_id }
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const row = result.rows[0];

    const userCount = await db.execute(`SELECT COUNT(*) AS CNT FROM USERS`, {});
    const incCount = await db.execute(
      `SELECT COUNT(*) AS TOTAL,
              SUM(CASE WHEN status = 'OPEN' THEN 1 ELSE 0 END) AS OPEN_CNT,
              SUM(CASE WHEN status = 'RESOLVED' THEN 1 ELSE 0 END) AS RESOLVED_CNT
         FROM INCIDENT_REPORTS`, {}
    );
    const ic = incCount.rows[0];

    return res.status(200).json({
      success:   true,
      full_name: row.FULL_NAME,
      email:     row.EMAIL,
      role:      row.ROLE,
      stats: {
        total_users:        userCount.rows[0].CNT || 0,
        total_incidents:    ic.TOTAL || 0,
        open_incidents:     ic.OPEN_CNT || 0,
        resolved_incidents: ic.RESOLVED_CNT || 0,
      },
    });
  } catch (err) {
    console.error('Dashboard /admin error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

module.exports = router;
