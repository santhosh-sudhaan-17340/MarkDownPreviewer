import fs from 'fs';
import path from 'path';
import { query, closePool } from './connection';

const runMigration = async () => {
  try {
    console.log('Starting database migration...');

    const schemaPath = path.join(__dirname, '../../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    // Split by semicolons but keep them together for statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    for (const statement of statements) {
      if (statement) {
        try {
          await query(statement + ';');
          console.log('✓ Executed statement');
        } catch (error: any) {
          // Ignore "already exists" errors
          if (!error.message.includes('already exists')) {
            throw error;
          } else {
            console.log('⊘ Statement already executed (skipping)');
          }
        }
      }
    }

    console.log('✓ Migration completed successfully!');
  } catch (error) {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  } finally {
    await closePool();
  }
};

// Run migration if this file is executed directly
if (require.main === module) {
  runMigration();
}

export default runMigration;
