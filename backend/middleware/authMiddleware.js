'use strict';

const jwt = require('jsonwebtoken');

/**
 * Express middleware — verifies the JWT Bearer token in the Authorization header.
 * Attaches decoded payload to req.user on success.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;          // { user_id, email, role, iat, exp }
    next();
  } catch (err) {
    const message =
      err.name === 'TokenExpiredError'
        ? 'Token has expired. Please log in again.'
        : 'Invalid token.';
    return res.status(401).json({ success: false, message });
  }
}

/**
 * Role-guard middleware factory.
 * Usage: router.get('/admin-only', authenticate, requireRole('ADMIN'), handler)
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden — insufficient role.' });
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
