'use strict';

const express = require('express');
const db      = require('../config/db');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

const VALID_CATEGORIES = ['THEFT', 'HARASSMENT', 'ACCIDENT', 'ROAD_HAZARD', 'SUSPICIOUS', 'WATERLOGGING', 'OTHER'];

// ──────────────────────────────────────────────────────────
//  POST /api/incidents — authenticated, create incident report
// ──────────────────────────────────────────────────────────
router.post('/', authenticate, async (req, res) => {
  const { zone_id, category, description, is_anon } = req.body;

  if (!zone_id || !category || !description) {
    return res.status(400).json({ success: false, message: 'zone_id, category, and description are required.' });
  }

  if (!VALID_CATEGORIES.includes(category)) {
    return res.status(400).json({
      success: false,
      message: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}.`,
    });
  }

  const isAnonymous = is_anon === 1 || is_anon === true || is_anon === '1';
  const userId = isAnonymous ? null : parseInt(req.user.user_id, 10);
  const parsedZoneId = parseInt(zone_id, 10);

  try {
    // Oracle BEFORE INSERT trigger assigns report_id from reports_seq automatically
    const result = await db.execute(
      `INSERT INTO INCIDENT_REPORTS (user_id, zone_id, category, description, is_anon, upvotes, status, created_at)
       VALUES (:user_id, :zone_id, :category, :description, :is_anon, 0, 'PENDING', SYSDATE)
       RETURNING report_id INTO :out_report_id`,
      {
        user_id:      userId,
        zone_id:      parsedZoneId,
        category:     category,
        description:  description,
        is_anon:      isAnonymous ? 1 : 0,
        out_report_id: { dir: require('oracledb').BIND_OUT, type: require('oracledb').NUMBER },
      }
    );

    const reportId = result.outBinds.out_report_id[0];
    return res.status(201).json({ success: true, report_id: reportId });
  } catch (err) {
    console.error('POST /incidents error:', err);
    return res.status(500).json({ success: false, message: 'Server error creating incident report.' });
  }
});

// ──────────────────────────────────────────────────────────
//  GET /api/incidents — public, fetch all incidents JOIN zones
// ──────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const result = await db.execute(
      `SELECT ir.report_id, ir.user_id, ir.zone_id, ir.category, ir.description,
              ir.is_anon, ir.upvotes, ir.status, ir.created_at,
              lz.area_name, lz.safety_score,
              u.full_name
         FROM INCIDENT_REPORTS ir
         JOIN LOCATION_ZONES lz ON ir.zone_id = lz.zone_id
         LEFT JOIN USERS u ON ir.user_id = u.user_id
        ORDER BY ir.created_at DESC`,
      {}
    );

    const incidents = result.rows.map(row => ({
      report_id:   row.REPORT_ID,
      zone_id:     row.ZONE_ID,
      category:    row.CATEGORY,
      description: row.DESCRIPTION,
      is_anon:     row.IS_ANON,
      upvotes:     row.UPVOTES,
      status:      row.STATUS,
      created_at:  row.CREATED_AT,
      area_name:   row.AREA_NAME,
      safety_score: row.SAFETY_SCORE,
      reporter_name: row.IS_ANON === 1 ? 'Anonymous User' : (row.FULL_NAME || 'Unknown'),
    }));

    return res.status(200).json({ success: true, incidents });
  } catch (err) {
    console.error('GET /incidents error:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching incidents.' });
  }
});

// ──────────────────────────────────────────────────────────
//  GET /api/incidents/my — authenticated, user's own reports
// ──────────────────────────────────────────────────────────
router.get('/my', authenticate, async (req, res) => {
  try {
    const result = await db.execute(
      `SELECT ir.report_id, ir.zone_id, ir.category, ir.description,
              ir.is_anon, ir.upvotes, ir.status, ir.created_at,
              lz.area_name
         FROM INCIDENT_REPORTS ir
         JOIN LOCATION_ZONES lz ON ir.zone_id = lz.zone_id
        WHERE ir.user_id = :user_id
        ORDER BY ir.created_at DESC`,
      { user_id: req.user.user_id }
    );

    const incidents = result.rows.map(row => ({
      report_id:   row.REPORT_ID,
      zone_id:     row.ZONE_ID,
      category:    row.CATEGORY,
      description: row.DESCRIPTION,
      is_anon:     row.IS_ANON,
      upvotes:     row.UPVOTES,
      status:      row.STATUS,
      created_at:  row.CREATED_AT,
      area_name:   row.AREA_NAME,
      reporter_name: row.IS_ANON === 1 ? 'Anonymous User' : 'Unknown',
    }));

    return res.status(200).json({ success: true, incidents });
  } catch (err) {
    console.error('GET /incidents/my error:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching your incidents.' });
  }
});

// ──────────────────────────────────────────────────────────
//  GET /api/incidents/anonymous — public, anon reports only
// ──────────────────────────────────────────────────────────
router.get('/anonymous', async (req, res) => {
  try {
    const result = await db.execute(
      `SELECT ir.report_id, ir.zone_id, ir.category, ir.description,
              ir.upvotes, ir.status, ir.created_at,
              lz.area_name
         FROM INCIDENT_REPORTS ir
         JOIN LOCATION_ZONES lz ON ir.zone_id = lz.zone_id
        WHERE ir.is_anon = 1
        ORDER BY ir.created_at DESC`,
      {}
    );

    const incidents = result.rows.map(row => ({
      report_id:   row.REPORT_ID,
      zone_id:     row.ZONE_ID,
      category:    row.CATEGORY,
      description: row.DESCRIPTION,
      upvotes:     row.UPVOTES,
      status:      row.STATUS,
      created_at:  row.CREATED_AT,
      area_name:   row.AREA_NAME,
      reporter_name: 'Anonymous User',
    }));

    return res.status(200).json({ success: true, incidents });
  } catch (err) {
    console.error('GET /incidents/anonymous error:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching anonymous incidents.' });
  }
});

// ──────────────────────────────────────────────────────────
//  POST /api/incidents/:id/upvote — authenticated, upvote +1
// ──────────────────────────────────────────────────────────
router.post('/:id/upvote', authenticate, async (req, res) => {
  const reportId = parseInt(req.params.id, 10);
  if (isNaN(reportId)) {
    return res.status(400).json({ success: false, message: 'Invalid report ID.' });
  }

  try {
    const check = await db.execute(
      `SELECT report_id, upvotes FROM INCIDENT_REPORTS WHERE report_id = :report_id`,
      { report_id: reportId }
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Incident report not found.' });
    }

    await db.execute(
      `UPDATE INCIDENT_REPORTS SET upvotes = upvotes + 1 WHERE report_id = :report_id`,
      { report_id: reportId }
    );

    const newUpvotes = check.rows[0].UPVOTES + 1;
    return res.status(200).json({ success: true, upvotes: newUpvotes });
  } catch (err) {
    console.error('POST /incidents/:id/upvote error:', err);
    return res.status(500).json({ success: false, message: 'Server error upvoting incident.' });
  }
});

module.exports = router;
