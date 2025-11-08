const express = require('express');
const { db } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// Get all achievements for user
router.get('/', (req, res) => {
    try {
        const achievements = db.prepare(`
            SELECT * FROM achievements
            WHERE user_id = ?
            ORDER BY unlocked_at DESC
        `).all(req.user.id);

        const totalPoints = achievements.reduce((sum, ach) => sum + ach.points, 0);

        res.json({
            achievements,
            totalPoints,
            count: achievements.length
        });
    } catch (error) {
        console.error('Get achievements error:', error);
        res.status(500).json({ error: 'Failed to fetch achievements' });
    }
});

// Get available achievements (not yet unlocked)
router.get('/available', (req, res) => {
    try {
        // Define all possible achievements
        const allAchievements = [
            { type: 'first_expense', title: 'First Step', description: 'Add your first expense', icon: '🎯', points: 10 },
            { type: 'ten_expenses', title: 'Getting Started', description: 'Track 10 expenses', icon: '📊', points: 25 },
            { type: 'hundred_expenses', title: 'Tracking Master', description: 'Track 100 expenses', icon: '🏆', points: 100 },
            { type: 'goal_completed', title: 'Goal Achieved!', description: 'Complete a savings goal', icon: '💰', points: 50 },
            { type: 'week_streak', title: 'Week Warrior', description: 'Track expenses for 7 days straight', icon: '🔥', points: 30 },
            { type: 'budget_master', title: 'Budget Master', description: 'Stay under budget for a month', icon: '👑', points: 75 },
            { type: 'receipt_scanner', title: 'Scanner Pro', description: 'Scan 10 receipts', icon: '📸', points: 40 }
        ];

        const unlocked = db.prepare('SELECT achievement_type FROM achievements WHERE user_id = ?').all(req.user.id);
        const unlockedTypes = new Set(unlocked.map(a => a.achievement_type));

        const available = allAchievements.filter(a => !unlockedTypes.has(a.type));

        res.json(available);
    } catch (error) {
        console.error('Get available achievements error:', error);
        res.status(500).json({ error: 'Failed to fetch available achievements' });
    }
});

module.exports = router;
