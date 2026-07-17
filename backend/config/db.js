'use strict';

const oracledb = require('oracledb');

// Use THIN mode — no Oracle Instant Client needed if using oracledb >= 6.x
//racledb.initOracleClient(); // comment this line out if you DON'T have Instant Client

let pool;

/**
 * Initialise the Oracle connection pool once at startup.
 */
async function initPool() {
  try {
    pool = await oracledb.createPool({
      user:             process.env.DB_USER,
      password:         process.env.DB_PASSWORD,
      connectString:    process.env.DB_CONNECTION_STRING,
      poolMin:          2,
      poolMax:          10,
      poolIncrement:    1,
      poolTimeout:      60,
      queueTimeout:     10000,
    });
    console.log('✅ Oracle DB pool created');
  } catch (err) {
    console.error('❌ Oracle pool creation failed:', err.message);
    process.exit(1);
  }
}

/**
 * Execute a SQL query with optional binds and options.
 * Automatically acquires + releases a connection from the pool.
 *
 * @param {string} sql
 * @param {object|Array} binds
 * @param {object} opts
 * @returns {Promise<oracledb.Result>}
 */
async function execute(sql, binds = {}, opts = {}) {
  const connection = await pool.getConnection();
  try {
    const defaultOpts = { outFormat: oracledb.OUT_FORMAT_OBJECT, autoCommit: true };
    const result = await connection.execute(sql, binds, { ...defaultOpts, ...opts });
    return result;
  } finally {
    await connection.close();
  }
}

/**
 * Close the pool gracefully on shutdown.
 */
async function closePool() {
  if (pool) {
    await pool.close(10);
    console.log('Oracle pool closed.');
  }
}

module.exports = { initPool, execute, closePool };
