const jwt = require('jsonwebtoken');
const pool = require('../config/database');

/**
 * Verify JWT token and attach user to request
 */
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Verify admin token
 */
async function authenticateAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verify user is an admin
    const result = await pool.query(
      'SELECT id, username, email, role, is_active FROM admin_users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0 || !result.rows[0].is_active) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.admin = result.rows[0];
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Check for specific admin role
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.admin || !allowedRoles.includes(req.admin.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

/**
 * Generate JWT token
 */
function generateToken(userId, type = 'user', expiresIn = null) {
  const payload = {
    userId,
    type
  };

  const options = {
    expiresIn: expiresIn || process.env.JWT_EXPIRES_IN || '24h'
  };

  return jwt.sign(payload, process.env.JWT_SECRET, options);
}

module.exports = {
  authenticateToken,
  authenticateAdmin,
  requireRole,
  generateToken
};
