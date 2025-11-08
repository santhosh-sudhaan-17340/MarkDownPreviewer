const express = require('express');
const { db } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// Get all categories for user
router.get('/', (req, res) => {
    try {
        const categories = db.prepare('SELECT * FROM categories WHERE user_id = ? ORDER BY name').all(req.user.id);

        categories.forEach(cat => {
            if (cat.keywords) cat.keywords = JSON.parse(cat.keywords);
        });

        res.json(categories);
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// Create category
router.post('/', (req, res) => {
    try {
        const { name, icon, color, keywords = [] } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        const result = db.prepare(
            'INSERT INTO categories (user_id, name, icon, color, keywords) VALUES (?, ?, ?, ?, ?)'
        ).run(req.user.id, name, icon, color, JSON.stringify(keywords));

        const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
        if (category.keywords) category.keywords = JSON.parse(category.keywords);

        res.status(201).json(category);
    } catch (error) {
        if (error.message.includes('UNIQUE constraint')) {
            return res.status(400).json({ error: 'Category with this name already exists' });
        }
        console.error('Create category error:', error);
        res.status(500).json({ error: 'Failed to create category' });
    }
});

// Update category
router.put('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { name, icon, color, keywords } = req.body;

        const existing = db.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?').get(id, req.user.id);
        if (!existing) {
            return res.status(404).json({ error: 'Category not found' });
        }

        db.prepare(`
            UPDATE categories SET
                name = COALESCE(?, name),
                icon = COALESCE(?, icon),
                color = COALESCE(?, color),
                keywords = COALESCE(?, keywords)
            WHERE id = ?
        `).run(name, icon, color, keywords ? JSON.stringify(keywords) : null, id);

        const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
        if (updated.keywords) updated.keywords = JSON.parse(updated.keywords);

        res.json(updated);
    } catch (error) {
        console.error('Update category error:', error);
        res.status(500).json({ error: 'Failed to update category' });
    }
});

// Delete category
router.delete('/:id', (req, res) => {
    try {
        const { id } = req.params;

        const result = db.prepare('DELETE FROM categories WHERE id = ? AND user_id = ?').run(id, req.user.id);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Category not found' });
        }

        res.json({ message: 'Category deleted successfully' });
    } catch (error) {
        console.error('Delete category error:', error);
        res.status(500).json({ error: 'Failed to delete category' });
    }
});

module.exports = router;
