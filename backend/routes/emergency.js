'use strict';

const express = require('express');
const db      = require('../config/db');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

// ──────────────────────────────────────────────────────────
//  GET /api/emergency/contacts — authenticated, list contacts
// ──────────────────────────────────────────────────────────
router.get('/contacts', authenticate, async (req, res) => {
  try {
    const result = await db.execute(
      `SELECT contact_id, name, phone, relation
         FROM EMERGENCY_CONTACTS
        WHERE user_id = :user_id
        ORDER BY contact_id`,
      { user_id: req.user.user_id }
    );

    const contacts = result.rows.map(row => ({
      contact_id: row.CONTACT_ID,
      name:       row.NAME,
      phone:      row.PHONE,
      relation:   row.RELATION,
    }));

    return res.status(200).json({ success: true, contacts });
  } catch (err) {
    console.error('GET /emergency/contacts error:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching contacts.' });
  }
});

// ──────────────────────────────────────────────────────────
//  POST /api/emergency/contacts — authenticated, add contact
// ──────────────────────────────────────────────────────────
router.post('/contacts', authenticate, async (req, res) => {
  const { name, phone, relation } = req.body;

  if (!name || !phone || !relation) {
    return res.status(400).json({ success: false, message: 'name, phone, and relation are required.' });
  }

  const VALID_RELATIONS = ['Family', 'Friend', 'Colleague', 'Doctor', 'Police'];
  if (!VALID_RELATIONS.includes(relation)) {
    return res.status(400).json({
      success: false,
      message: `Invalid relation. Must be one of: ${VALID_RELATIONS.join(', ')}.`,
    });
  }

  try {
    // Oracle BEFORE INSERT trigger assigns contact_id from contacts_seq automatically
    const result = await db.execute(
      `INSERT INTO EMERGENCY_CONTACTS (user_id, name, phone, relation)
       VALUES (:user_id, :name, :phone, :relation)
       RETURNING contact_id INTO :out_contact_id`,
      {
        user_id:       req.user.user_id,
        name:          name,
        phone:         phone,
        relation:      relation,
        out_contact_id: { dir: require('oracledb').BIND_OUT, type: require('oracledb').NUMBER },
      }
    );

    const contactId = result.outBinds.out_contact_id[0];
    return res.status(201).json({ success: true, contact_id: contactId, message: 'Contact added successfully.' });
  } catch (err) {
    console.error('POST /emergency/contacts error:', err);
    return res.status(500).json({ success: false, message: 'Server error adding contact.' });
  }
});

// ──────────────────────────────────────────────────────────
//  DELETE /api/emergency/contacts/:id — authenticated, delete own contact
// ──────────────────────────────────────────────────────────
router.delete('/contacts/:id', authenticate, async (req, res) => {
  const contactId = parseInt(req.params.id, 10);
  if (isNaN(contactId)) {
    return res.status(400).json({ success: false, message: 'Invalid contact ID.' });
  }

  try {
    // Verify it belongs to the current user
    const check = await db.execute(
      `SELECT contact_id FROM EMERGENCY_CONTACTS WHERE contact_id = :contact_id AND user_id = :user_id`,
      { contact_id: contactId, user_id: req.user.user_id }
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Contact not found or access denied.' });
    }

    await db.execute(
      `DELETE FROM EMERGENCY_CONTACTS WHERE contact_id = :contact_id AND user_id = :user_id`,
      { contact_id: contactId, user_id: req.user.user_id }
    );

    return res.status(200).json({ success: true, message: 'Contact deleted successfully.' });
  } catch (err) {
    console.error('DELETE /emergency/contacts/:id error:', err);
    return res.status(500).json({ success: false, message: 'Server error deleting contact.' });
  }
});

module.exports = router;
