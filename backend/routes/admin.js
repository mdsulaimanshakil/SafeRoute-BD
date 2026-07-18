'use strict';

const express = require('express');
const db      = require('../config/db');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticate, requireRole('ADMIN'));

// ──────────────────────────────────────────────────────────
//  GET /api/admin/users
// ──────────────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const result = await db.execute(
      `SELECT user_id, full_name, email, role, created_at FROM USERS ORDER BY created_at DESC`,
      {}
    );
    
    const users = result.rows.map(row => ({
      user_id: row.USER_ID,
      full_name: row.FULL_NAME,
      email: row.EMAIL,
      role: row.ROLE,
      created_at: row.CREATED_AT
    }));
    
    res.status(200).json({ success: true, users });
  } catch (err) {
    console.error('GET /api/admin/users error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching users.' });
  }
});

// ──────────────────────────────────────────────────────────
//  PUT /api/admin/users/:id/role
// ──────────────────────────────────────────────────────────
router.put('/users/:id/role', async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const { role } = req.body;
  
  if (isNaN(userId)) {
    return res.status(400).json({ success: false, message: 'Invalid user ID.' });
  }
  
  if (role !== 'PUBLIC_USER' && role !== 'ADMIN') {
    return res.status(400).json({ success: false, message: 'Invalid role. Must be PUBLIC_USER or ADMIN.' });
  }
  
  try {
    const checkUser = await db.execute(`SELECT user_id FROM USERS WHERE user_id = :id`, { id: userId });
    if (checkUser.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    
    await db.execute(
      `UPDATE USERS SET role = :role WHERE user_id = :id`,
      { role: role, id: userId }
    );
    
    res.status(200).json({ success: true, message: 'User role updated successfully.' });
  } catch (err) {
    console.error('PUT /api/admin/users/:id/role error:', err);
    res.status(500).json({ success: false, message: 'Server error updating role.' });
  }
});

// ──────────────────────────────────────────────────────────
//  DELETE /api/admin/users/:id
// ──────────────────────────────────────────────────────────
router.delete('/users/:id', async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  
  if (isNaN(userId)) {
    return res.status(400).json({ success: false, message: 'Invalid user ID.' });
  }
  
  try {
    // Check if user exists
    const checkUser = await db.execute(`SELECT user_id FROM USERS WHERE user_id = :id`, { id: userId });
    if (checkUser.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    
    // In Oracle, due to foreign keys (fk_reports_user, fk_contacts_user), we either have to rely on ON DELETE CASCADE 
    // or delete child records first. Assuming ON DELETE CASCADE is not set, let's delete child records manually.
    await db.execute(`DELETE FROM EMERGENCY_CONTACTS WHERE user_id = :id`, { id: userId });
    // For INCIDENT_REPORTS, we can't just delete them if SAFETY_ALERTS reference them, 
    // but the schema says user_id can be NULL. Let's just NULLify user_id to keep the reports.
    await db.execute(`UPDATE INCIDENT_REPORTS SET user_id = NULL WHERE user_id = :id`, { id: userId });
    
    await db.execute(`DELETE FROM USERS WHERE user_id = :id`, { id: userId });
    
    res.status(200).json({ success: true, message: 'User deleted successfully.' });
  } catch (err) {
    console.error('DELETE /api/admin/users/:id error:', err);
    res.status(500).json({ success: false, message: 'Server error deleting user.' });
  }
});

module.exports = router;
