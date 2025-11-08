const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'ticketing_system',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});

async function migrate() {
    const client = await pool.connect();

    try {
        console.log('Starting database migration...');

        // Read and execute schema.sql
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        await client.query(schema);

        console.log('✓ Database schema created successfully');
        console.log('✓ All tables, indexes, and triggers have been set up');

    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run migration
if (require.main === module) {
    migrate()
        .then(() => {
            console.log('Migration completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}

module.exports = { migrate };
