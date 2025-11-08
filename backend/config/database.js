const { Pool } = require('pg');
require('dotenv').config();

// Database configuration
const poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'leaderboard_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return error after 2 seconds if connection cannot be established
};

// Create connection pool
const pool = new Pool(poolConfig);

// Handle pool errors
pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Error connecting to database:', err);
    } else {
        console.log('Database connected successfully at:', res.rows[0].now);
    }
});

// Query helper with connection retry and error handling
const query = async (text, params) => {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('Executed query', { text, duration, rows: res.rowCount });
        return res;
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
};

// Transaction helper with automatic rollback on error
const transaction = async (callback) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

// Get a client from pool for complex operations
const getClient = async () => {
    return await pool.connect();
};

// Refresh materialized view for rankings
const refreshRankings = async () => {
    try {
        await query('REFRESH MATERIALIZED VIEW CONCURRENTLY global_rankings');
        console.log('Global rankings refreshed successfully');
    } catch (error) {
        console.error('Error refreshing rankings:', error);
        throw error;
    }
};

module.exports = {
    pool,
    query,
    transaction,
    getClient,
    refreshRankings
};
