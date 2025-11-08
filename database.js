const Database = require('better-sqlite3');
const path = require('path');

// Initialize SQLite database
const db = new Database(path.join(__dirname, 'urls.db'));

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS urls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_url TEXT NOT NULL,
    short_code TEXT UNIQUE NOT NULL,
    custom_code BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    clicks INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS clicks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url_id INTEGER NOT NULL,
    clicked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_agent TEXT,
    referrer TEXT,
    ip_address TEXT,
    FOREIGN KEY (url_id) REFERENCES urls(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_short_code ON urls(short_code);
  CREATE INDEX IF NOT EXISTS idx_url_id ON clicks(url_id);
  CREATE INDEX IF NOT EXISTS idx_created_at ON urls(created_at);
`);

// Prepared statements for better performance
const statements = {
  // Insert new URL
  insertUrl: db.prepare(`
    INSERT INTO urls (original_url, short_code, custom_code, expires_at)
    VALUES (?, ?, ?, ?)
  `),

  // Get URL by short code
  getUrlByCode: db.prepare(`
    SELECT * FROM urls WHERE short_code = ? AND is_active = 1
  `),

  // Check if short code exists
  codeExists: db.prepare(`
    SELECT COUNT(*) as count FROM urls WHERE short_code = ?
  `),

  // Increment click count
  incrementClicks: db.prepare(`
    UPDATE urls SET clicks = clicks + 1 WHERE id = ?
  `),

  // Record click analytics
  recordClick: db.prepare(`
    INSERT INTO clicks (url_id, user_agent, referrer, ip_address)
    VALUES (?, ?, ?, ?)
  `),

  // Get all URLs
  getAllUrls: db.prepare(`
    SELECT * FROM urls WHERE is_active = 1 ORDER BY created_at DESC
  `),

  // Get URL by ID
  getUrlById: db.prepare(`
    SELECT * FROM urls WHERE id = ?
  `),

  // Delete URL (soft delete)
  deleteUrl: db.prepare(`
    UPDATE urls SET is_active = 0 WHERE id = ?
  `),

  // Get analytics for a URL
  getUrlAnalytics: db.prepare(`
    SELECT
      u.*,
      COUNT(c.id) as total_clicks,
      MAX(c.clicked_at) as last_clicked
    FROM urls u
    LEFT JOIN clicks c ON u.id = c.url_id
    WHERE u.short_code = ?
    GROUP BY u.id
  `),

  // Get click history for a URL
  getClickHistory: db.prepare(`
    SELECT * FROM clicks WHERE url_id = ? ORDER BY clicked_at DESC LIMIT 100
  `),

  // Get statistics
  getStats: db.prepare(`
    SELECT
      COUNT(*) as total_urls,
      SUM(clicks) as total_clicks,
      AVG(clicks) as avg_clicks
    FROM urls WHERE is_active = 1
  `)
};

module.exports = {
  db,
  statements
};
