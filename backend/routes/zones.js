'use strict';

const express = require('express');
const db      = require('../config/db');

const router = express.Router();

// ──────────────────────────────────────────────────────────
//  GET /api/zones — public, fetch all LOCATION_ZONES
// ──────────────────────────────────────────────────────────
router.get('/', async (_req, res) => {
  try {
    const result = await db.execute(
      `SELECT zone_id, area_name, latitude, longitude, safety_score, is_high_risk
         FROM LOCATION_ZONES
        ORDER BY area_name`,
      {}
    );

    const zones = result.rows.map(row => ({
      zone_id: row.ZONE_ID,
      area_name: row.AREA_NAME,
      latitude: row.LATITUDE,
      longitude: row.LONGITUDE,
      safety_score: row.SAFETY_SCORE,
      is_high_risk: row.IS_HIGH_RISK,
    }));

    return res.status(200).json({ success: true, zones });
  } catch (err) {
    console.error('GET /zones error:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching zones.' });
  }
});

module.exports = router;