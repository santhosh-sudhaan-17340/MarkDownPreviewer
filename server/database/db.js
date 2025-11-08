const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../../expenses.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database schema
function initDatabase() {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    db.exec(schema);
    console.log('Database initialized successfully');

    // Insert default categories
    insertDefaultCategories();
}

function insertDefaultCategories() {
    const defaultCategories = [
        { name: 'Food & Dining', icon: '🍔', color: '#FF6B6B', keywords: ['restaurant', 'food', 'cafe', 'dining', 'lunch', 'dinner', 'breakfast', 'grocery'] },
        { name: 'Transportation', icon: '🚗', color: '#4ECDC4', keywords: ['uber', 'lyft', 'taxi', 'gas', 'fuel', 'parking', 'transit', 'bus', 'train'] },
        { name: 'Shopping', icon: '🛍️', color: '#FFE66D', keywords: ['amazon', 'store', 'shopping', 'retail', 'clothes', 'fashion'] },
        { name: 'Entertainment', icon: '🎬', color: '#A8E6CF', keywords: ['movie', 'cinema', 'netflix', 'spotify', 'game', 'entertainment', 'concert'] },
        { name: 'Bills & Utilities', icon: '💡', color: '#FF8B94', keywords: ['electric', 'water', 'gas', 'internet', 'phone', 'utility', 'bill'] },
        { name: 'Healthcare', icon: '🏥', color: '#C7CEEA', keywords: ['doctor', 'hospital', 'pharmacy', 'medical', 'health', 'insurance'] },
        { name: 'Education', icon: '📚', color: '#B4A7D6', keywords: ['school', 'course', 'book', 'education', 'tuition', 'class'] },
        { name: 'Travel', icon: '✈️', color: '#FFD93D', keywords: ['hotel', 'flight', 'airbnb', 'travel', 'vacation', 'trip'] },
        { name: 'Other', icon: '📦', color: '#95E1D3', keywords: [] }
    ];

    // This will be called after user creation, stored for reference
    db.insertDefaultCategories = defaultCategories;
}

module.exports = {
    db,
    initDatabase
};
