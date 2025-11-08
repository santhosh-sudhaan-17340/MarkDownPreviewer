import { readFileSync } from 'fs';
import { join } from 'path';
import Database from './connection';

async function migrate() {
    const db = Database.getInstance();

    try {
        console.log('Starting database migration...');

        // Read and execute schema
        const schemaSQL = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
        await db.query(schemaSQL);
        console.log('✓ Schema created successfully');

        // Read and execute seed data
        const seedSQL = readFileSync(join(__dirname, 'seed.sql'), 'utf-8');
        await db.query(seedSQL);
        console.log('✓ Seed data inserted successfully');

        console.log('Migration completed successfully!');
    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    } finally {
        await db.close();
    }
}

// Run migration if this file is executed directly
if (require.main === module) {
    migrate()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

export default migrate;
