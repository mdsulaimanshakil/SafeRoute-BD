'use strict';

const express = require('express');
const db      = require('../config/db');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// ──────────────────────────────────────────────────────────
//  GET /api/safety/scores — public, all zones ordered by safety_score ASC
// ──────────────────────────────────────────────────────────
router.get('/scores', async (req, res) => {
  try {
    const result = await db.execute(
      `SELECT zone_id, area_name, latitude, longitude, safety_score, is_high_risk
         FROM LOCATION_ZONES
        ORDER BY safety_score ASC`,
      {}
    );

    const zones = result.rows.map(row => ({
      zone_id:      row.ZONE_ID,
      area_name:    row.AREA_NAME,
      latitude:     row.LATITUDE,
      longitude:    row.LONGITUDE,
      safety_score: row.SAFETY_SCORE,
      is_high_risk: row.IS_HIGH_RISK,
    }));

    return res.status(200).json({ success: true, zones });
  } catch (err) {
    console.error('GET /safety/scores error:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching safety scores.' });
  }
});

// ──────────────────────────────────────────────────────────
//  GET /api/safety/high-risk — public, zones WHERE is_high_risk=1
// ──────────────────────────────────────────────────────────
router.get('/high-risk', async (req, res) => {
  try {
    const result = await db.execute(
      `SELECT zone_id, area_name, latitude, longitude, safety_score, is_high_risk
         FROM LOCATION_ZONES
        WHERE is_high_risk = 1
        ORDER BY safety_score ASC`,
      {}
    );

    const zones = result.rows.map(row => ({
      zone_id:      row.ZONE_ID,
      area_name:    row.AREA_NAME,
      latitude:     row.LATITUDE,
      longitude:    row.LONGITUDE,
      safety_score: row.SAFETY_SCORE,
      is_high_risk: row.IS_HIGH_RISK,
    }));

    return res.status(200).json({ success: true, zones });
  } catch (err) {
    console.error('GET /safety/high-risk error:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching high-risk zones.' });
  }
});

// ──────────────────────────────────────────────────────────
//  POST /api/safety/calculate/:zone_id — ADMIN only
//  Recalculates safety_score = GREATEST(0, 100 - incident_count * 10)
//  Sets is_high_risk = 1 if score < 40, else 0
// ──────────────────────────────────────────────────────────
router.post('/calculate/:zone_id', authenticate, requireRole('ADMIN'), async (req, res) => {
  const zoneId = parseInt(req.params.zone_id, 10);
  if (isNaN(zoneId)) {
    return res.status(400).json({ success: false, message: 'Invalid zone ID.' });
  }

  try {
    // Verify zone exists
    const zoneCheck = await db.execute(
      `SELECT zone_id, area_name FROM LOCATION_ZONES WHERE zone_id = :zone_id`,
      { zone_id: zoneId }
    );
    if (zoneCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Zone not found.' });
    }

    // Count incidents for this zone
    const countResult = await db.execute(
      `SELECT COUNT(*) AS CNT FROM INCIDENT_REPORTS WHERE zone_id = :zone_id`,
      { zone_id: zoneId }
    );
    const incidentCount = countResult.rows[0].CNT || 0;

    // Calculate new safety score
    const newScore    = Math.max(0, 100 - incidentCount * 10);
    const newHighRisk = newScore < 40 ? 1 : 0;

    // Update LOCATION_ZONES
    await db.execute(
      `UPDATE LOCATION_ZONES
          SET safety_score = :safety_score,
              is_high_risk = :is_high_risk
        WHERE zone_id = :zone_id`,
      {
        safety_score: newScore,
        is_high_risk: newHighRisk,
        zone_id:      zoneId,
      }
    );

    return res.status(200).json({
      success:        true,
      zone_id:        zoneId,
      area_name:      zoneCheck.rows[0].AREA_NAME,
      incident_count: incidentCount,
      new_score:      newScore,
      is_high_risk:   newHighRisk,
      message:        `Safety score recalculated: ${newScore} (${newHighRisk ? 'HIGH RISK' : 'Normal'})`,
    });
  } catch (err) {
    console.error('POST /safety/calculate/:zone_id error:', err);
    return res.status(500).json({ success: false, message: 'Server error calculating safety score.' });
  }
});

module.exports = router;
