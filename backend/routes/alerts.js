'use strict';

const express = require('express');
const db      = require('../config/db');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

const VALID_SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

// ──────────────────────────────────────────────────────────
//  GET /api/alerts — public, fetch all alerts with zone name
// ──────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const result = await db.execute(
      `SELECT sa.alert_id, sa.zone_id, sa.report_id, sa.message, sa.severity, sa.broadcast,
              lz.area_name
         FROM SAFETY_ALERTS sa
         JOIN LOCATION_ZONES lz ON sa.zone_id = lz.zone_id
        ORDER BY sa.broadcast DESC`,
      {}
    );

    const alerts = result.rows.map(row => ({
      alert_id:  row.ALERT_ID,
      zone_id:   row.ZONE_ID,
      report_id: row.REPORT_ID,
      message:   row.MESSAGE,
      severity:  row.SEVERITY,
      broadcast: row.BROADCAST,
      area_name: row.AREA_NAME,
    }));

    return res.status(200).json({ success: true, alerts });
  } catch (err) {
    console.error('GET /alerts error:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching alerts.' });
  }
});

// ──────────────────────────────────────────────────────────
//  POST /api/alerts — ADMIN only, create safety alert
// ──────────────────────────────────────────────────────────
router.post('/', authenticate, requireRole('ADMIN'), async (req, res) => {
  const { zone_id, report_id, message, severity } = req.body;

  if (!zone_id || !message || !severity) {
    return res.status(400).json({ success: false, message: 'zone_id, message, and severity are required.' });
  }

  if (!VALID_SEVERITIES.includes(severity)) {
    return res.status(400).json({
      success: false,
      message: `Invalid severity. Must be one of: ${VALID_SEVERITIES.join(', ')}.`,
    });
  }

  try {
    // Oracle BEFORE INSERT trigger assigns alert_id from alerts_seq automatically
    const parsedZoneId = parseInt(zone_id, 10);
    const parsedReportId = report_id ? parseInt(report_id, 10) : null;

    const result = await db.execute(
      `INSERT INTO SAFETY_ALERTS (zone_id, report_id, message, severity, broadcast)
       VALUES (:zone_id, :report_id, :message, :severity, SYSDATE)
       RETURNING alert_id INTO :out_alert_id`,
      {
        zone_id:     parsedZoneId,
        report_id:   parsedReportId,
        message:     message,
        severity:    severity,
        out_alert_id: { dir: require('oracledb').BIND_OUT, type: require('oracledb').NUMBER },
      }
    );

    const alertId = result.outBinds.out_alert_id[0];
    return res.status(201).json({ success: true, alert_id: alertId, message: 'Alert broadcast successfully.' });
  } catch (err) {
    console.error('POST /alerts error:', err);
    return res.status(500).json({ success: false, message: 'Server error creating alert.' });
  }
});

// ──────────────────────────────────────────────────────────
//  GET /api/alerts/zone/:zone_id — public, alerts for a zone
// ──────────────────────────────────────────────────────────
router.get('/zone/:zone_id', async (req, res) => {
  const zoneId = parseInt(req.params.zone_id, 10);
  if (isNaN(zoneId)) {
    return res.status(400).json({ success: false, message: 'Invalid zone ID.' });
  }

  try {
    const result = await db.execute(
      `SELECT sa.alert_id, sa.zone_id, sa.report_id, sa.message, sa.severity, sa.broadcast,
              lz.area_name
         FROM SAFETY_ALERTS sa
         JOIN LOCATION_ZONES lz ON sa.zone_id = lz.zone_id
        WHERE sa.zone_id = :zone_id
        ORDER BY sa.broadcast DESC`,
      { zone_id: zoneId }
    );

    const alerts = result.rows.map(row => ({
      alert_id:  row.ALERT_ID,
      zone_id:   row.ZONE_ID,
      report_id: row.REPORT_ID,
      message:   row.MESSAGE,
      severity:  row.SEVERITY,
      broadcast: row.BROADCAST,
      area_name: row.AREA_NAME,
    }));

    return res.status(200).json({ success: true, alerts });
  } catch (err) {
    console.error('GET /alerts/zone/:zone_id error:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching zone alerts.' });
  }
});

module.exports = router;
