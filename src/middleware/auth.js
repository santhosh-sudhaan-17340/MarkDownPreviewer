const jwt = require('jsonwebtoken');
const { cacheService } = require('../config/redis');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Generate JWT token
const generateToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRY || '24h' }
  );
};

// Verify JWT token middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Check if token is blacklisted
    const isBlacklisted = await cacheService.get(`blacklist:${token}`);
    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        message: 'Token is invalid'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    req.token = token;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions'
      });
    }

    next();
  };
};

// Logout (blacklist token)
const logout = async (token, expiresIn = 86400) => {
  await cacheService.set(`blacklist:${token}`, true, expiresIn);
};

module.exports = {
  generateToken,
  authenticate,
  authorize,
  logout
};
