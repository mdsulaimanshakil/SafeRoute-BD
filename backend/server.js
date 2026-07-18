'use strict';

require('dotenv').config();

const express     = require('express');
const cors        = require('cors');
const rateLimit   = require('express-rate-limit');
const db          = require('./config/db');
const authRoutes       = require('./routes/auth');
const dashboardRoutes  = require('./routes/dashboard');
const incidentRoutes   = require('./routes/incidents');
const emergencyRoutes  = require('./routes/emergency');
const alertRoutes      = require('./routes/alerts');
const safetyRoutes     = require('./routes/safety');
const searchRoutes     = require('./routes/search');
const analyticsRoutes  = require('./routes/analytics');

const app  = express();
const PORT = process.env.PORT || 3000;

// ──────────────────────────────────────────────────────────
//  CORS
// ──────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://127.0.0.1:5500',
    'http://localhost:5500',
    'null',           // allows opening HTML files directly (file://)
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ──────────────────────────────────────────────────────────
//  Body parsers
// ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ──────────────────────────────────────────────────────────
//  Rate limiting — prevents brute-force on auth endpoints
// ──────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 20,                     // max 20 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});

// ──────────────────────────────────────────────────────────
//  Routes
// ──────────────────────────────────────────────────────────
app.use('/api/auth',      authLimiter, authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/zones',     incidentRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/alerts',    alertRoutes);
app.use('/api/safety',    safetyRoutes);
app.use('/api/search',    searchRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'SafeRoute BD API is running.', timestamp: new Date() });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint not found.' });
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error.' });
});

// ──────────────────────────────────────────────────────────
//  Boot
// ──────────────────────────────────────────────────────────
(async () => {
  await db.initPool();

  const server = app.listen(PORT, () => {
    console.log(`\n🛡️  SafeRoute BD API running at http://localhost:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/health\n`);
  });

  // Graceful shutdown
  const shutdown = async (signal) => {
    console.log(`\n${signal} received — shutting down gracefully…`);
    server.close(async () => {
      await db.closePool();
      process.exit(0);
    });
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
})();
