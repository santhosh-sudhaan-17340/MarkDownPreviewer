/**
 * Database Configuration and Connection Pool
 */

const { Pool } = require('pg');
const logger = require('../utils/logger');

// Database configuration
const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'subscription_billing',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    min: parseInt(process.env.DB_POOL_MIN || '2'),
    max: parseInt(process.env.DB_POOL_MAX || '10'),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};

// Create connection pool
const pool = new Pool(config);

// Event handlers
pool.on('connect', () => {
    logger.info('Database connection established');
});

pool.on('error', (err) => {
    logger.error('Unexpected database error:', err);
    process.exit(-1);
});

/**
 * Execute a query with error handling
 */
async function query(text, params) {
    const start = Date.now();
    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;
        logger.debug('Executed query', { text, duration, rows: result.rowCount });
        return result;
    } catch (error) {
        logger.error('Database query error:', { text, error: error.message });
        throw error;
    }
}

/**
 * Get a client from the pool for transactions
 */
async function getClient() {
    const client = await pool.connect();
    const originalQuery = client.query;
    const originalRelease = client.release;

    // Set a timeout for the client
    const timeout = setTimeout(() => {
        logger.error('Client has been checked out for more than 5 seconds!');
    }, 5000);

    // Override release to clear timeout
    client.release = () => {
        clearTimeout(timeout);
        client.query = originalQuery;
        client.release = originalRelease;
        return originalRelease.apply(client);
    };

    return client;
}

/**
 * Execute a function within a transaction
 */
async function transaction(callback) {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('Transaction rolled back:', error);
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Test database connection
 */
async function testConnection() {
    try {
        const result = await query('SELECT NOW()');
        logger.info('Database connection test successful:', result.rows[0]);
        return true;
    } catch (error) {
        logger.error('Database connection test failed:', error);
        return false;
    }
}

/**
 * Close all database connections
 */
async function close() {
    await pool.end();
    logger.info('Database pool closed');
}

module.exports = {
    query,
    getClient,
    transaction,
    testConnection,
    close,
    pool,
};
