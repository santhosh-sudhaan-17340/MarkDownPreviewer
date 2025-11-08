const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const UserController = require('../controllers/userController');

// Validation rules
const createUserValidation = [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('full_name').trim().notEmpty().withMessage('Full name is required'),
  body('role').isIn(['customer', 'agent', 'admin']).withMessage('Invalid role'),
];

const assignSkillsValidation = [
  body('skills').isArray().withMessage('Skills must be an array'),
  body('skills.*.skill_id').isInt().withMessage('Skill ID must be an integer'),
  body('skills.*.proficiency_level').optional().isIn(['beginner', 'intermediate', 'expert'])
    .withMessage('Invalid proficiency level'),
];

// Routes
router.post('/', createUserValidation, UserController.createUser);
router.get('/', UserController.getUsers);
router.get('/agents', UserController.getAgents);
router.get('/:id', UserController.getUser);
router.put('/:id', UserController.updateUser);
router.get('/:id/agent-details', UserController.getAgentWithSkills);
router.put('/:id/skills', assignSkillsValidation, UserController.assignSkills);
router.get('/:id/statistics', UserController.getAgentStatistics);
router.get('/skills/:skillId/agents', UserController.findAgentsBySkill);

module.exports = router;
