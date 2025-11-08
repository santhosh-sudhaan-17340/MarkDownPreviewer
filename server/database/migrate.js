const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('Starting database migration...');

    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    await client.query('BEGIN');
    await client.query(schemaSql);
    await client.query('COMMIT');

    console.log('✓ Database migration completed successfully');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('✗ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(err => {
  console.error(err);
  process.exit(1);
});
