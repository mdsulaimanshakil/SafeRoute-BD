'use strict';

const express = require('express');
const db      = require('../config/db');

const router = express.Router();

const VALID_CATEGORIES = ['THEFT', 'HARASSMENT', 'ACCIDENT', 'ROAD_HAZARD', 'SUSPICIOUS', 'WATERLOGGING', 'OTHER'];
const VALID_STATUSES   = ['PENDING', 'OPEN', 'RESOLVED'];
const VALID_SORTS      = ['latest', 'upvotes', 'oldest'];

// ──────────────────────────────────────────────────────────
//  GET /api/search/incidents
//  Query params: ?category= &zone_id= &status= &keyword= &sort= &page= &limit=
// ──────────────────────────────────────────────────────────
router.get('/incidents', async (req, res) => {
  const { category, zone_id, status, keyword, sort, page, limit } = req.query;

  const pageNum  = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const offset   = (pageNum - 1) * limitNum;

  // Build WHERE clause dynamically
  const conditions = [];
  const binds = {};

  if (category && VALID_CATEGORIES.includes(category.toUpperCase())) {
    conditions.push('ir.category = :category');
    binds.category = category.toUpperCase();
  }

  if (zone_id && !isNaN(parseInt(zone_id, 10))) {
    conditions.push('ir.zone_id = :zone_id');
    binds.zone_id = parseInt(zone_id, 10);
  }

  if (status && VALID_STATUSES.includes(status.toUpperCase())) {
    conditions.push('ir.status = :status');
    binds.status = status.toUpperCase();
  }

  if (keyword && keyword.trim().length > 0) {
    conditions.push('UPPER(ir.description) LIKE :keyword');
    binds.keyword = `%${keyword.trim().toUpperCase()}%`;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Build ORDER BY
  let orderClause;
  switch ((sort || 'latest').toLowerCase()) {
    case 'upvotes': orderClause = 'ir.upvotes DESC, ir.created_at DESC'; break;
    case 'oldest':  orderClause = 'ir.created_at ASC';                   break;
    default:        orderClause = 'ir.created_at DESC';                   break;
  }

  // Pagination binds (Oracle uses OFFSET/FETCH)
  binds.limit_num  = limitNum;
  binds.offset_num = offset;

  try {
    // Total count query
    const countSql = `
      SELECT COUNT(*) AS TOTAL
        FROM INCIDENT_REPORTS ir
        ${whereClause}`;

    const countResult = await db.execute(countSql, binds);
    const totalCount  = countResult.rows[0].TOTAL || 0;
    const totalPages  = Math.ceil(totalCount / limitNum);

    // Data query with pagination
    const dataSql = `
      SELECT ir.report_id, ir.user_id, ir.zone_id, ir.category, ir.description,
             ir.is_anon, ir.upvotes, ir.status, ir.created_at,
             lz.area_name,
             u.full_name
        FROM INCIDENT_REPORTS ir
        JOIN LOCATION_ZONES lz ON ir.zone_id = lz.zone_id
        LEFT JOIN USERS u ON ir.user_id = u.user_id
        ${whereClause}
       ORDER BY ${orderClause}
      OFFSET :offset_num ROWS FETCH NEXT :limit_num ROWS ONLY`;

    const dataResult = await db.execute(dataSql, binds);

    const results = dataResult.rows.map(row => ({
      report_id:   row.REPORT_ID,
      zone_id:     row.ZONE_ID,
      category:    row.CATEGORY,
      description: row.DESCRIPTION,
      is_anon:     row.IS_ANON,
      upvotes:     row.UPVOTES,
      status:      row.STATUS,
      created_at:  row.CREATED_AT,
      area_name:   row.AREA_NAME,
      reporter:    row.IS_ANON === 1 ? 'Anonymous User' : (row.FULL_NAME || 'Unknown'),
    }));

    return res.status(200).json({
      success:     true,
      results,
      total_count: totalCount,
      page:        pageNum,
      limit:       limitNum,
      total_pages: totalPages,
    });
  } catch (err) {
    console.error('GET /search/incidents error:', err);
    return res.status(500).json({ success: false, message: 'Server error searching incidents.' });
  }
});

// ──────────────────────────────────────────────────────────
//  GET /api/search/zones — search zones by area_name keyword
//  Query params: ?keyword=
// ──────────────────────────────────────────────────────────
router.get('/zones', async (req, res) => {
  const { keyword } = req.query;

  try {
    let sql;
    let binds;

    if (keyword && keyword.trim().length > 0) {
      sql = `SELECT zone_id, area_name, latitude, longitude, safety_score, is_high_risk
               FROM LOCATION_ZONES
              WHERE UPPER(area_name) LIKE :keyword
              ORDER BY area_name`;
      binds = { keyword: `%${keyword.trim().toUpperCase()}%` };
    } else {
      sql = `SELECT zone_id, area_name, latitude, longitude, safety_score, is_high_risk
               FROM LOCATION_ZONES
              ORDER BY area_name`;
      binds = {};
    }

    const result = await db.execute(sql, binds);

    const zones = result.rows.map(row => ({
      zone_id:      row.ZONE_ID,
      area_name:    row.AREA_NAME,
      latitude:     row.LATITUDE,
      longitude:    row.LONGITUDE,
      safety_score: row.SAFETY_SCORE,
      is_high_risk: row.IS_HIGH_RISK,
    }));

    return res.status(200).json({ success: true, zones, total_count: zones.length });
  } catch (err) {
    console.error('GET /search/zones error:', err);
    return res.status(500).json({ success: false, message: 'Server error searching zones.' });
  }
});

module.exports = router;
