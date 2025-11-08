const fs = require('fs');
const path = require('path');
const { pool } = require('./connection');

async function initializeDatabase() {
  try {
    console.log('Starting database initialization...');

    // Read schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Execute schema
    await pool.query(schema);

    console.log('✓ Database schema created successfully');
    console.log('✓ Default SLA rules inserted');
    console.log('✓ Default skills inserted');
    console.log('✓ Database initialization complete');

    process.exit(0);
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

initializeDatabase();
