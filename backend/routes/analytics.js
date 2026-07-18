'use strict';

const express = require('express');
const db      = require('../config/db');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// ──────────────────────────────────────────────────────────
//  GET /api/analytics/summary — ADMIN only
//  Returns total, resolved, pending, open, anonymous counts
// ──────────────────────────────────────────────────────────
router.get('/summary', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const result = await db.execute(
      `SELECT
         COUNT(*)                                          AS TOTAL,
         COUNT(CASE WHEN status = 'RESOLVED'  THEN 1 END) AS RESOLVED,
         COUNT(CASE WHEN status = 'PENDING'   THEN 1 END) AS PENDING,
         COUNT(CASE WHEN status = 'OPEN'      THEN 1 END) AS OPEN_COUNT,
         COUNT(CASE WHEN is_anon = 1          THEN 1 END) AS ANONYMOUS
       FROM INCIDENT_REPORTS`,
      {}
    );

    const row = result.rows[0];
    return res.status(200).json({
      success: true,
      summary: {
        total_incidents: row.TOTAL      || 0,
        resolved_count:  row.RESOLVED   || 0,
        pending_count:   row.PENDING    || 0,
        open_count:      row.OPEN_COUNT || 0,
        anonymous_count: row.ANONYMOUS  || 0,
      },
    });
  } catch (err) {
    console.error('GET /analytics/summary error:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching summary.' });
  }
});

// ──────────────────────────────────────────────────────────
//  GET /api/analytics/by-category — ADMIN only
//  Incident count grouped by category
// ──────────────────────────────────────────────────────────
router.get('/by-category', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const result = await db.execute(
      `SELECT category, COUNT(*) AS INCIDENT_COUNT
         FROM INCIDENT_REPORTS
        GROUP BY category
        ORDER BY INCIDENT_COUNT DESC`,
      {}
    );

    const categories = result.rows.map(row => ({
      category:       row.CATEGORY,
      incident_count: row.INCIDENT_COUNT,
    }));

    return res.status(200).json({ success: true, categories });
  } catch (err) {
    console.error('GET /analytics/by-category error:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching category analytics.' });
  }
});

// ──────────────────────────────────────────────────────────
//  GET /api/analytics/by-zone — ADMIN only
//  Incident count grouped by zone, joined with LOCATION_ZONES
// ──────────────────────────────────────────────────────────
router.get('/by-zone', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const result = await db.execute(
      `SELECT ir.zone_id, lz.area_name, COUNT(*) AS INCIDENT_COUNT,
              lz.safety_score, lz.is_high_risk
         FROM INCIDENT_REPORTS ir
         JOIN LOCATION_ZONES lz ON ir.zone_id = lz.zone_id
        GROUP BY ir.zone_id, lz.area_name, lz.safety_score, lz.is_high_risk
        ORDER BY INCIDENT_COUNT DESC`,
      {}
    );

    const zones = result.rows.map(row => ({
      zone_id:        row.ZONE_ID,
      area_name:      row.AREA_NAME,
      incident_count: row.INCIDENT_COUNT,
      safety_score:   row.SAFETY_SCORE,
      is_high_risk:   row.IS_HIGH_RISK,
    }));

    return res.status(200).json({ success: true, zones });
  } catch (err) {
    console.error('GET /analytics/by-zone error:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching zone analytics.' });
  }
});

// ──────────────────────────────────────────────────────────
//  GET /api/analytics/trend — ADMIN only
//  Last 7 days incident count grouped by day (TRUNC date)
// ──────────────────────────────────────────────────────────
router.get('/trend', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const result = await db.execute(
      `SELECT TRUNC(created_at) AS INCIDENT_DATE, COUNT(*) AS INCIDENT_COUNT
         FROM INCIDENT_REPORTS
        WHERE created_at >= SYSDATE - 7
        GROUP BY TRUNC(created_at)
        ORDER BY INCIDENT_DATE ASC`,
      {}
    );

    // Build a full 7-day array filling in zeroes for missing days
    const trendMap = {};
    result.rows.forEach(row => {
      const d = new Date(row.INCIDENT_DATE);
      const key = d.toISOString().split('T')[0];
      trendMap[key] = row.INCIDENT_COUNT || 0;
    });

    const trend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      trend.push({ day: key, incident_count: trendMap[key] || 0 });
    }

    return res.status(200).json({ success: true, trend });
  } catch (err) {
    console.error('GET /analytics/trend error:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching trend data.' });
  }
});

module.exports = router;
