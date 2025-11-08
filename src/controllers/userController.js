const User = require('../models/User');
const { validationResult } = require('express-validator');

class UserController {
  // Create new user
  static async createUser(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userData = {
        username: req.body.username,
        email: req.body.email,
        full_name: req.body.full_name,
        role: req.body.role,
        is_active: req.body.is_active,
      };

      const user = await User.create(userData);

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: user,
      });
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create user',
        error: error.message,
      });
    }
  }

  // Get user by ID
  static async getUser(req, res) {
    try {
      const userId = parseInt(req.params.id);
      const user = await User.getById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user',
        error: error.message,
      });
    }
  }

  // Get all users
  static async getUsers(req, res) {
    try {
      const role = req.query.role;
      const users = await User.getAll(role);

      res.json({
        success: true,
        count: users.length,
        data: users,
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch users',
        error: error.message,
      });
    }
  }

  // Get all agents
  static async getAgents(req, res) {
    try {
      const agents = await User.getAllAgents();

      res.json({
        success: true,
        count: agents.length,
        data: agents,
      });
    } catch (error) {
      console.error('Error fetching agents:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch agents',
        error: error.message,
      });
    }
  }

  // Get agent with skills
  static async getAgentWithSkills(req, res) {
    try {
      const agentId = parseInt(req.params.id);
      const agent = await User.getAgentWithSkills(agentId);

      if (!agent) {
        return res.status(404).json({
          success: false,
          message: 'Agent not found',
        });
      }

      res.json({
        success: true,
        data: agent,
      });
    } catch (error) {
      console.error('Error fetching agent with skills:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch agent with skills',
        error: error.message,
      });
    }
  }

  // Assign skills to agent
  static async assignSkills(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const agentId = parseInt(req.params.id);
      const skills = req.body.skills;

      const agent = await User.assignSkills(agentId, skills);

      res.json({
        success: true,
        message: 'Skills assigned successfully',
        data: agent,
      });
    } catch (error) {
      console.error('Error assigning skills:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to assign skills',
        error: error.message,
      });
    }
  }

  // Find agents by skill
  static async findAgentsBySkill(req, res) {
    try {
      const skillId = parseInt(req.params.skillId);
      const proficiencyLevel = req.query.proficiency_level;

      const agents = await User.findAgentsBySkill(skillId, proficiencyLevel);

      res.json({
        success: true,
        count: agents.length,
        data: agents,
      });
    } catch (error) {
      console.error('Error finding agents by skill:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to find agents by skill',
        error: error.message,
      });
    }
  }

  // Get agent statistics
  static async getAgentStatistics(req, res) {
    try {
      const agentId = parseInt(req.params.id);
      const stats = await User.getAgentStatistics(agentId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Error fetching agent statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch agent statistics',
        error: error.message,
      });
    }
  }

  // Update user
  static async updateUser(req, res) {
    try {
      const userId = parseInt(req.params.id);
      const updateData = {
        username: req.body.username,
        email: req.body.email,
        full_name: req.body.full_name,
        is_active: req.body.is_active,
      };

      const user = await User.update(userId, updateData);

      res.json({
        success: true,
        message: 'User updated successfully',
        data: user,
      });
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user',
        error: error.message,
      });
    }
  }
}

module.exports = UserController;
