require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./database/db');
const { getSupportedCurrencies } = require('./utils/helpers');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Initialize database
initDatabase();

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/budgets', require('./routes/budgets'));
app.use('/api/savings', require('./routes/savings'));
app.use('/api/achievements', require('./routes/achievements'));
app.use('/api/ocr', require('./routes/ocr'));

// Currencies endpoint
app.get('/api/currencies', (req, res) => {
    res.json(getSupportedCurrencies());
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Smart Expense Manager API is running' });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../client/build')));

    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../client/build/index.html'));
    });
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
    console.log(`🚀 Smart Expense Manager server running on port ${PORT}`);
    console.log(`📊 API available at http://localhost:${PORT}/api`);
});
