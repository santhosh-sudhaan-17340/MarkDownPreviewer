const { User } = require('../models');
const jwt = require('jsonwebtoken');

class AuthController {

  // Register new user
  static async register(req, res) {
    try {
      const { email, password, full_name, role } = req.body;

      // Check if user exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      // Create user
      const user = await User.create({
        email,
        password_hash: password,
        full_name,
        role: role || 'customer'
      });

      // Generate token
      const token = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
      );

      res.status(201).json({
        user,
        token
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Login
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await User.findOne({ where: { email } });
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Validate password
      const isValid = await user.validatePassword(password);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      if (!user.is_active) {
        return res.status(401).json({ error: 'Account is inactive' });
      }

      // Generate token
      const token = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
      );

      res.json({
        user,
        token
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Get current user
  static async getCurrentUser(req, res) {
    try {
      const user = await User.findByPk(req.userId, {
        include: ['Skills']
      });
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = AuthController;
