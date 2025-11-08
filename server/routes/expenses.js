const express = require('express');
const { db } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const { convertCurrency, autoCategori } = require('../utils/helpers');

const router = express.Router();
router.use(authenticateToken);

// Get all expenses for user
router.get('/', (req, res) => {
    try {
        const { startDate, endDate, categoryId, limit = 100, offset = 0 } = req.query;

        let query = 'SELECT e.*, c.name as category_name, c.icon as category_icon FROM expenses e LEFT JOIN categories c ON e.category_id = c.id WHERE e.user_id = ?';
        const params = [req.user.id];

        if (startDate) {
            query += ' AND e.date >= ?';
            params.push(startDate);
        }
        if (endDate) {
            query += ' AND e.date <= ?';
            params.push(endDate);
        }
        if (categoryId) {
            query += ' AND e.category_id = ?';
            params.push(categoryId);
        }

        query += ' ORDER BY e.date DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const expenses = db.prepare(query).all(...params);

        // Parse JSON fields
        expenses.forEach(exp => {
            if (exp.tags) exp.tags = JSON.parse(exp.tags);
        });

        res.json(expenses);
    } catch (error) {
        console.error('Get expenses error:', error);
        res.status(500).json({ error: 'Failed to fetch expenses' });
    }
});

// Create expense
router.post('/', async (req, res) => {
    try {
        const {
            amount,
            currency = 'USD',
            description,
            merchant,
            date,
            categoryId,
            paymentMethod,
            isRecurring = 0,
            tags = []
        } = req.body;

        if (!amount || !date) {
            return res.status(400).json({ error: 'Amount and date are required' });
        }

        // Convert to USD for normalization
        const amountUsd = await convertCurrency(amount, currency, 'USD');

        // Auto-categorize if no category provided
        let finalCategoryId = categoryId;
        if (!finalCategoryId && (description || merchant)) {
            finalCategoryId = await autoCategorize(req.user.id, description || merchant);
        }

        const result = db.prepare(`
            INSERT INTO expenses (
                user_id, category_id, amount, currency, amount_usd,
                description, merchant, date, payment_method, is_recurring, tags
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            req.user.id,
            finalCategoryId,
            amount,
            currency,
            amountUsd,
            description,
            merchant,
            date,
            paymentMethod,
            isRecurring,
            JSON.stringify(tags)
        );

        // Check achievements
        await checkAchievements(req.user.id, 'expense_added');

        // Check budget alerts
        await checkBudgetAlerts(req.user.id, finalCategoryId);

        const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(result.lastInsertRowid);
        if (expense.tags) expense.tags = JSON.parse(expense.tags);

        res.status(201).json(expense);
    } catch (error) {
        console.error('Create expense error:', error);
        res.status(500).json({ error: 'Failed to create expense' });
    }
});

// Update expense
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            amount,
            currency,
            description,
            merchant,
            date,
            categoryId,
            paymentMethod,
            isRecurring,
            tags
        } = req.body;

        // Verify ownership
        const existing = db.prepare('SELECT * FROM expenses WHERE id = ? AND user_id = ?').get(id, req.user.id);
        if (!existing) {
            return res.status(404).json({ error: 'Expense not found' });
        }

        const amountUsd = currency && amount
            ? await convertCurrency(amount, currency, 'USD')
            : existing.amount_usd;

        db.prepare(`
            UPDATE expenses SET
                amount = COALESCE(?, amount),
                currency = COALESCE(?, currency),
                amount_usd = ?,
                description = COALESCE(?, description),
                merchant = COALESCE(?, merchant),
                date = COALESCE(?, date),
                category_id = COALESCE(?, category_id),
                payment_method = COALESCE(?, payment_method),
                is_recurring = COALESCE(?, is_recurring),
                tags = COALESCE(?, tags),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(
            amount,
            currency,
            amountUsd,
            description,
            merchant,
            date,
            categoryId,
            paymentMethod,
            isRecurring,
            tags ? JSON.stringify(tags) : null,
            id
        );

        const updated = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id);
        if (updated.tags) updated.tags = JSON.parse(updated.tags);

        res.json(updated);
    } catch (error) {
        console.error('Update expense error:', error);
        res.status(500).json({ error: 'Failed to update expense' });
    }
});

// Delete expense
router.delete('/:id', (req, res) => {
    try {
        const { id } = req.params;

        const result = db.prepare('DELETE FROM expenses WHERE id = ? AND user_id = ?').run(id, req.user.id);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Expense not found' });
        }

        res.json({ message: 'Expense deleted successfully' });
    } catch (error) {
        console.error('Delete expense error:', error);
        res.status(500).json({ error: 'Failed to delete expense' });
    }
});

// Get expense statistics
router.get('/stats', async (req, res) => {
    try {
        const { period = 'month', startDate, endDate } = req.query;

        let dateFilter = '';
        if (startDate && endDate) {
            dateFilter = `AND date BETWEEN '${startDate}' AND '${endDate}'`;
        } else {
            const periodDays = { day: 1, week: 7, month: 30, year: 365 }[period] || 30;
            dateFilter = `AND date >= date('now', '-${periodDays} days')`;
        }

        // Total spending
        const total = db.prepare(`
            SELECT SUM(amount_usd) as total FROM expenses
            WHERE user_id = ? ${dateFilter}
        `).get(req.user.id);

        // By category
        const byCategory = db.prepare(`
            SELECT c.name, c.icon, c.color, SUM(e.amount_usd) as total, COUNT(*) as count
            FROM expenses e
            LEFT JOIN categories c ON e.category_id = c.id
            WHERE e.user_id = ? ${dateFilter}
            GROUP BY e.category_id
            ORDER BY total DESC
        `).all(req.user.id);

        // Daily trend
        const dailyTrend = db.prepare(`
            SELECT date, SUM(amount_usd) as total
            FROM expenses
            WHERE user_id = ? ${dateFilter}
            GROUP BY date
            ORDER BY date ASC
        `).all(req.user.id);

        res.json({
            total: total.total || 0,
            byCategory,
            dailyTrend
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// Helper functions
async function autoCategorize(userId, text) {
    try {
        const categories = db.prepare('SELECT * FROM categories WHERE user_id = ?').all(userId);
        const lowerText = text.toLowerCase();

        for (const category of categories) {
            const keywords = JSON.parse(category.keywords || '[]');
            for (const keyword of keywords) {
                if (lowerText.includes(keyword.toLowerCase())) {
                    return category.id;
                }
            }
        }

        // Return 'Other' category if no match
        const otherCategory = categories.find(c => c.name === 'Other');
        return otherCategory ? otherCategory.id : null;
    } catch (error) {
        console.error('Auto-categorize error:', error);
        return null;
    }
}

async function checkAchievements(userId, type) {
    try {
        if (type === 'expense_added') {
            const count = db.prepare('SELECT COUNT(*) as count FROM expenses WHERE user_id = ?').get(userId);

            if (count.count === 1) {
                // First expense achievement
                db.prepare(`
                    INSERT OR IGNORE INTO achievements (user_id, achievement_type, title, description, icon, points)
                    VALUES (?, 'first_expense', 'First Step', 'Added your first expense!', '🎯', 10)
                `).run(userId);
            } else if (count.count === 10) {
                db.prepare(`
                    INSERT OR IGNORE INTO achievements (user_id, achievement_type, title, description, icon, points)
                    VALUES (?, 'ten_expenses', 'Getting Started', 'Tracked 10 expenses!', '📊', 25)
                `).run(userId);
            } else if (count.count === 100) {
                db.prepare(`
                    INSERT OR IGNORE INTO achievements (user_id, achievement_type, title, description, icon, points)
                    VALUES (?, 'hundred_expenses', 'Tracking Master', 'Tracked 100 expenses!', '🏆', 100)
                `).run(userId);
            }
        }
    } catch (error) {
        console.error('Check achievements error:', error);
    }
}

async function checkBudgetAlerts(userId, categoryId) {
    try {
        const budgets = db.prepare(`
            SELECT * FROM budgets
            WHERE user_id = ? AND is_active = 1
            AND (category_id = ? OR category_id IS NULL)
            AND start_date <= date('now')
            AND (end_date IS NULL OR end_date >= date('now'))
        `).all(userId, categoryId);

        for (const budget of budgets) {
            let spent;
            if (budget.category_id) {
                spent = db.prepare(`
                    SELECT SUM(amount_usd) as total FROM expenses
                    WHERE user_id = ? AND category_id = ? AND date >= ?
                `).get(userId, budget.category_id, budget.start_date);
            } else {
                spent = db.prepare(`
                    SELECT SUM(amount_usd) as total FROM expenses
                    WHERE user_id = ? AND date >= ?
                `).get(userId, budget.start_date);
            }

            const percentage = (spent.total / budget.amount) * 100;

            // In a real app, you'd send notifications here
            if (percentage >= budget.alert_threshold) {
                console.log(`Budget alert for user ${userId}: ${percentage.toFixed(1)}% of budget used`);
            }
        }
    } catch (error) {
        console.error('Check budget alerts error:', error);
    }
}

module.exports = router;
