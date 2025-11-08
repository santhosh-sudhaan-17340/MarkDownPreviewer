const express = require('express');
const { db } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// Get all savings goals
router.get('/', (req, res) => {
    try {
        const goals = db.prepare(`
            SELECT * FROM savings_goals
            WHERE user_id = ?
            ORDER BY is_completed ASC, deadline ASC
        `).all(req.user.id);

        goals.forEach(goal => {
            goal.progress = (goal.current_amount / goal.target_amount) * 100;
        });

        res.json(goals);
    } catch (error) {
        console.error('Get savings goals error:', error);
        res.status(500).json({ error: 'Failed to fetch savings goals' });
    }
});

// Create savings goal
router.post('/', (req, res) => {
    try {
        const { name, targetAmount, currentAmount = 0, currency = 'USD', deadline, icon, color } = req.body;

        if (!name || !targetAmount) {
            return res.status(400).json({ error: 'Name and target amount are required' });
        }

        const result = db.prepare(`
            INSERT INTO savings_goals (user_id, name, target_amount, current_amount, currency, deadline, icon, color)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(req.user.id, name, targetAmount, currentAmount, currency, deadline, icon, color);

        const goal = db.prepare('SELECT * FROM savings_goals WHERE id = ?').get(result.lastInsertRowid);
        goal.progress = (goal.current_amount / goal.target_amount) * 100;

        res.status(201).json(goal);
    } catch (error) {
        console.error('Create savings goal error:', error);
        res.status(500).json({ error: 'Failed to create savings goal' });
    }
});

// Update savings goal progress
router.put('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { currentAmount, name, targetAmount, deadline, icon, color } = req.body;

        const existing = db.prepare('SELECT * FROM savings_goals WHERE id = ? AND user_id = ?').get(id, req.user.id);
        if (!existing) {
            return res.status(404).json({ error: 'Savings goal not found' });
        }

        const newAmount = currentAmount !== undefined ? currentAmount : existing.current_amount;
        const newTarget = targetAmount !== undefined ? targetAmount : existing.target_amount;
        const isCompleted = newAmount >= newTarget ? 1 : 0;

        db.prepare(`
            UPDATE savings_goals SET
                name = COALESCE(?, name),
                target_amount = COALESCE(?, target_amount),
                current_amount = COALESCE(?, current_amount),
                deadline = COALESCE(?, deadline),
                icon = COALESCE(?, icon),
                color = COALESCE(?, color),
                is_completed = ?,
                completed_at = CASE WHEN ? = 1 AND is_completed = 0 THEN CURRENT_TIMESTAMP ELSE completed_at END
            WHERE id = ?
        `).run(name, targetAmount, currentAmount, deadline, icon, color, isCompleted, isCompleted, id);

        // Award achievement if goal completed
        if (isCompleted && !existing.is_completed) {
            db.prepare(`
                INSERT OR IGNORE INTO achievements (user_id, achievement_type, title, description, icon, points)
                VALUES (?, 'goal_completed', 'Goal Achieved!', 'Completed a savings goal', '💰', 50)
            `).run(req.user.id);
        }

        const updated = db.prepare('SELECT * FROM savings_goals WHERE id = ?').get(id);
        updated.progress = (updated.current_amount / updated.target_amount) * 100;

        res.json(updated);
    } catch (error) {
        console.error('Update savings goal error:', error);
        res.status(500).json({ error: 'Failed to update savings goal' });
    }
});

// Delete savings goal
router.delete('/:id', (req, res) => {
    try {
        const { id } = req.params;

        const result = db.prepare('DELETE FROM savings_goals WHERE id = ? AND user_id = ?').run(id, req.user.id);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Savings goal not found' });
        }

        res.json({ message: 'Savings goal deleted successfully' });
    } catch (error) {
        console.error('Delete savings goal error:', error);
        res.status(500).json({ error: 'Failed to delete savings goal' });
    }
});

module.exports = router;
