const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

// Database connection pool configuration
const poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'parcel_locker_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    max: parseInt(process.env.DB_MAX_CONNECTIONS) || 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};

// Use DATABASE_URL if provided (common in production environments like Heroku)
if (process.env.DATABASE_URL) {
    poolConfig.connectionString = process.env.DATABASE_URL;
    poolConfig.ssl = process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false;
}

const pool = new Pool(poolConfig);

// Handle pool errors
pool.on('error', (err, client) => {
    console.error('Unexpected error on idle database client', err);
    process.exit(-1);
});

// Test database connection
pool.on('connect', () => {
    console.log('✓ Database connected successfully');
});

/**
 * Execute a query with parameters
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @returns {Promise<object>} Query result
 */
const query = async (text, params) => {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;

        if (process.env.LOG_LEVEL === 'debug') {
            console.log('Executed query', { text, duration, rows: res.rowCount });
        }

        return res;
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
};

/**
 * Get a client from the pool for transactions
 * @returns {Promise<object>} Database client
 */
const getClient = async () => {
    const client = await pool.connect();
    const query = client.query;
    const release = client.release;

    // Set a timeout of 5 seconds for the client
    const timeout = setTimeout(() => {
        console.error('Client has been checked out for more than 5 seconds!');
    }, 5000);

    // Monkey patch the query method to track queries
    client.query = (...args) => {
        client.lastQuery = args;
        return query.apply(client, args);
    };

    // Monkey patch the release method to clear timeout
    client.release = () => {
        clearTimeout(timeout);
        client.query = query;
        client.release = release;
        return release.apply(client);
    };

    return client;
};

/**
 * Execute a function within a transaction
 * @param {Function} callback - Async function to execute within transaction
 * @returns {Promise<*>} Result of the callback
 */
const transaction = async (callback) => {
    const client = await getClient();

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

/**
 * Health check for database connection
 * @returns {Promise<boolean>} True if healthy
 */
const healthCheck = async () => {
    try {
        const result = await query('SELECT NOW() as current_time, version() as db_version');
        return {
            status: 'healthy',
            timestamp: result.rows[0].current_time,
            version: result.rows[0].db_version.split(' ')[0] + ' ' + result.rows[0].db_version.split(' ')[1]
        };
    } catch (error) {
        return {
            status: 'unhealthy',
            error: error.message
        };
    }
};

/**
 * Close the database pool
 */
const closePool = async () => {
    await pool.end();
    console.log('Database pool closed');
};

module.exports = {
    query,
    getClient,
    transaction,
    healthCheck,
    closePool,
    pool
};
