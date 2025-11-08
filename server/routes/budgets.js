const express = require('express');
const { db } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// Get all budgets for user
router.get('/', (req, res) => {
    try {
        const budgets = db.prepare(`
            SELECT b.*, c.name as category_name, c.icon as category_icon
            FROM budgets b
            LEFT JOIN categories c ON b.category_id = c.id
            WHERE b.user_id = ?
            ORDER BY b.created_at DESC
        `).all(req.user.id);

        // Calculate spending for each budget
        budgets.forEach(budget => {
            let spent;
            if (budget.category_id) {
                spent = db.prepare(`
                    SELECT SUM(amount_usd) as total FROM expenses
                    WHERE user_id = ? AND category_id = ? AND date >= ?
                `).get(req.user.id, budget.category_id, budget.start_date);
            } else {
                spent = db.prepare(`
                    SELECT SUM(amount_usd) as total FROM expenses
                    WHERE user_id = ? AND date >= ?
                `).get(req.user.id, budget.start_date);
            }

            budget.spent = spent.total || 0;
            budget.remaining = budget.amount - budget.spent;
            budget.percentage = (budget.spent / budget.amount) * 100;
        });

        res.json(budgets);
    } catch (error) {
        console.error('Get budgets error:', error);
        res.status(500).json({ error: 'Failed to fetch budgets' });
    }
});

// Create budget
router.post('/', (req, res) => {
    try {
        const { categoryId, amount, currency = 'USD', period, startDate, endDate, alertThreshold = 80 } = req.body;

        if (!amount || !period || !startDate) {
            return res.status(400).json({ error: 'Amount, period, and start date are required' });
        }

        const result = db.prepare(`
            INSERT INTO budgets (user_id, category_id, amount, currency, period, start_date, end_date, alert_threshold)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(req.user.id, categoryId, amount, currency, period, startDate, endDate, alertThreshold);

        const budget = db.prepare('SELECT * FROM budgets WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(budget);
    } catch (error) {
        console.error('Create budget error:', error);
        res.status(500).json({ error: 'Failed to create budget' });
    }
});

// Update budget
router.put('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { categoryId, amount, currency, period, startDate, endDate, alertThreshold, isActive } = req.body;

        const existing = db.prepare('SELECT * FROM budgets WHERE id = ? AND user_id = ?').get(id, req.user.id);
        if (!existing) {
            return res.status(404).json({ error: 'Budget not found' });
        }

        db.prepare(`
            UPDATE budgets SET
                category_id = COALESCE(?, category_id),
                amount = COALESCE(?, amount),
                currency = COALESCE(?, currency),
                period = COALESCE(?, period),
                start_date = COALESCE(?, start_date),
                end_date = COALESCE(?, end_date),
                alert_threshold = COALESCE(?, alert_threshold),
                is_active = COALESCE(?, is_active)
            WHERE id = ?
        `).run(categoryId, amount, currency, period, startDate, endDate, alertThreshold, isActive, id);

        const updated = db.prepare('SELECT * FROM budgets WHERE id = ?').get(id);
        res.json(updated);
    } catch (error) {
        console.error('Update budget error:', error);
        res.status(500).json({ error: 'Failed to update budget' });
    }
});

// Delete budget
router.delete('/:id', (req, res) => {
    try {
        const { id } = req.params;

        const result = db.prepare('DELETE FROM budgets WHERE id = ? AND user_id = ?').run(id, req.user.id);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Budget not found' });
        }

        res.json({ message: 'Budget deleted successfully' });
    } catch (error) {
        console.error('Delete budget error:', error);
        res.status(500).json({ error: 'Failed to delete budget' });
    }
});

module.exports = router;
