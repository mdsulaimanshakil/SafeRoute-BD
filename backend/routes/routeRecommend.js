'use strict';

const express = require('express');
const db      = require('../config/db');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// ──────────────────────────────────────────────────────────
//  GET /api/routes — public, fetch all recommended routes
// ──────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const sql = `
      SELECT r.route_id, r.safety_rate, r.last_calc,
             sz.zone_id AS start_zone_id, sz.area_name AS start_zone_name, sz.is_high_risk AS start_high_risk,
             ez.zone_id AS end_zone_id, ez.area_name AS end_zone_name, ez.is_high_risk AS end_high_risk
        FROM ROUTE_RECOMMENDATIONS r
        JOIN LOCATION_ZONES sz ON r.start_zone = sz.zone_id
        JOIN LOCATION_ZONES ez ON r.end_zone = ez.zone_id
       ORDER BY r.safety_rate DESC
    `;
    const result = await db.execute(sql, {});
    
    const routes = result.rows.map(row => ({
      route_id: row.ROUTE_ID,
      start_zone: { id: row.START_ZONE_ID, name: row.START_ZONE_NAME, is_high_risk: row.START_HIGH_RISK },
      end_zone: { id: row.END_ZONE_ID, name: row.END_ZONE_NAME, is_high_risk: row.END_HIGH_RISK },
      safety_rate: row.SAFETY_RATE,
      last_calc: row.LAST_CALC
    }));

    res.status(200).json({ success: true, routes });
  } catch (err) {
    console.error('GET /api/routes error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching routes.' });
  }
});

// ──────────────────────────────────────────────────────────
//  GET /api/routes/recommend?from=X&to=Y — public
// ──────────────────────────────────────────────────────────
router.get('/recommend', async (req, res) => {
  const fromZone = parseInt(req.query.from, 10);
  const toZone = parseInt(req.query.to, 10);

  if (isNaN(fromZone) || isNaN(toZone)) {
    return res.status(400).json({ success: false, message: 'from and to zone_ids are required.' });
  }

  try {
    // 1. Check if route exists in ROUTE_RECOMMENDATIONS
    const routeSql = `
      SELECT r.route_id, r.safety_rate, r.last_calc,
             sz.zone_id AS start_zone_id, sz.area_name AS start_zone_name, sz.latitude AS sz_lat, sz.longitude AS sz_lng, sz.safety_score AS sz_score, sz.is_high_risk AS start_high_risk,
             ez.zone_id AS end_zone_id, ez.area_name AS end_zone_name, ez.latitude AS ez_lat, ez.longitude AS ez_lng, ez.safety_score AS ez_score, ez.is_high_risk AS end_high_risk
        FROM ROUTE_RECOMMENDATIONS r
        JOIN LOCATION_ZONES sz ON r.start_zone = sz.zone_id
        JOIN LOCATION_ZONES ez ON r.end_zone = ez.zone_id
       WHERE r.start_zone = :from_zone AND r.end_zone = :to_zone
    `;
    const routeResult = await db.execute(routeSql, { from_zone: fromZone, to_zone: toZone });

    if (routeResult.rows.length > 0) {
      const row = routeResult.rows[0];
      const hasHighRisk = row.START_HIGH_RISK === 1 || row.END_HIGH_RISK === 1;
      
      return res.status(200).json({
        success: true,
        route: {
          route_id: row.ROUTE_ID,
          safety_rate: row.SAFETY_RATE,
          start_zone: { id: row.START_ZONE_ID, name: row.START_ZONE_NAME, lat: row.SZ_LAT, lng: row.SZ_LNG, score: row.SZ_SCORE, is_high_risk: row.START_HIGH_RISK },
          end_zone: { id: row.END_ZONE_ID, name: row.END_ZONE_NAME, lat: row.EZ_LAT, lng: row.EZ_LNG, score: row.EZ_SCORE, is_high_risk: row.END_HIGH_RISK },
          warning: hasHighRisk,
          cached: true
        }
      });
    }

    // 2. If not found, fetch both zones and construct a suggested path
    const zonesSql = `
      SELECT zone_id, area_name, latitude, longitude, safety_score, is_high_risk
        FROM LOCATION_ZONES
       WHERE zone_id IN (:from_zone, :to_zone)
    `;
    const zonesResult = await db.execute(zonesSql, { from_zone: fromZone, to_zone: toZone });
    
    if (zonesResult.rows.length !== 2) {
      return res.status(404).json({ success: false, message: 'One or both zones not found.' });
    }

    let startZone, endZone;
    for (const z of zonesResult.rows) {
      if (z.ZONE_ID === fromZone) startZone = z;
      if (z.ZONE_ID === toZone) endZone = z;
    }

    // To handle edge case if fromZone == toZone (length would be 1 but they matched twice, handled below if length!=2)
    if (!startZone || !endZone) {
      return res.status(400).json({ success: false, message: 'Invalid zones provided.' });
    }

    const calculatedSafetyRate = (startZone.SAFETY_SCORE + endZone.SAFETY_SCORE) / 2;
    const hasHighRisk = startZone.IS_HIGH_RISK === 1 || endZone.IS_HIGH_RISK === 1;

    res.status(200).json({
      success: true,
      route: {
        safety_rate: calculatedSafetyRate,
        start_zone: { id: startZone.ZONE_ID, name: startZone.AREA_NAME, lat: startZone.LATITUDE, lng: startZone.LONGITUDE, score: startZone.SAFETY_SCORE, is_high_risk: startZone.IS_HIGH_RISK },
        end_zone: { id: endZone.ZONE_ID, name: endZone.AREA_NAME, lat: endZone.LATITUDE, lng: endZone.LONGITUDE, score: endZone.SAFETY_SCORE, is_high_risk: endZone.IS_HIGH_RISK },
        warning: hasHighRisk,
        cached: false
      }
    });

  } catch (err) {
    console.error('GET /api/routes/recommend error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching route recommendation.' });
  }
});

// ──────────────────────────────────────────────────────────
//  POST /api/routes/calculate — ADMIN only
// ──────────────────────────────────────────────────────────
router.post('/calculate', authenticate, requireRole('ADMIN'), async (req, res) => {
  const { start_zone, end_zone } = req.body;

  if (!start_zone || !end_zone || isNaN(start_zone) || isNaN(end_zone)) {
    return res.status(400).json({ success: false, message: 'start_zone and end_zone are required.' });
  }

  try {
    const zonesSql = `
      SELECT zone_id, safety_score
        FROM LOCATION_ZONES
       WHERE zone_id IN (:start_zone, :end_zone)
    `;
    const zonesResult = await db.execute(zonesSql, { start_zone: start_zone, end_zone: end_zone });

    if (zonesResult.rows.length !== 2 && start_zone !== end_zone) {
      return res.status(404).json({ success: false, message: 'One or both zones not found.' });
    }

    let szScore = 0, ezScore = 0;
    if (start_zone === end_zone && zonesResult.rows.length === 1) {
      szScore = zonesResult.rows[0].SAFETY_SCORE;
      ezScore = szScore;
    } else {
      for (const z of zonesResult.rows) {
        if (z.ZONE_ID === parseInt(start_zone, 10)) szScore = z.SAFETY_SCORE;
        if (z.ZONE_ID === parseInt(end_zone, 10)) ezScore = z.SAFETY_SCORE;
      }
    }

    const safetyRate = (szScore + ezScore) / 2;

    const insertSql = `
      INSERT INTO ROUTE_RECOMMENDATIONS (start_zone, end_zone, safety_rate, last_calc)
      VALUES (:start_zone, :end_zone, :safety_rate, SYSDATE)
      RETURNING route_id INTO :out_route_id
    `;
    const insertBinds = {
      start_zone: start_zone,
      end_zone: end_zone,
      safety_rate: safetyRate,
      out_route_id: { dir: require('oracledb').BIND_OUT, type: require('oracledb').NUMBER }
    };

    const insertResult = await db.execute(insertSql, insertBinds);
    const routeId = insertResult.outBinds.out_route_id[0];

    res.status(201).json({ success: true, message: 'Route cached successfully.', route_id: routeId, safety_rate: safetyRate });
  } catch (err) {
    console.error('POST /api/routes/calculate error:', err);
    res.status(500).json({ success: false, message: 'Server error caching route.' });
  }
});

module.exports = router;
