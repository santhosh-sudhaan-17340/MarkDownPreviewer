require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Create pool without database name to connect to PostgreSQL server
const systemPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: 'postgres' // Connect to default postgres database
});

const dbName = process.env.DB_NAME || 'parcel_locker_db';

async function setupDatabase() {
    let client;

    try {
        console.log('🚀 Starting database setup...\n');

        // 1. Check if database exists
        console.log(`📊 Checking if database '${dbName}' exists...`);
        client = await systemPool.connect();

        const dbCheckResult = await client.query(
            'SELECT 1 FROM pg_database WHERE datname = $1',
            [dbName]
        );

        if (dbCheckResult.rows.length === 0) {
            console.log(`   Database does not exist. Creating '${dbName}'...`);
            await client.query(`CREATE DATABASE ${dbName}`);
            console.log(`   ✓ Database '${dbName}' created successfully\n`);
        } else {
            console.log(`   ✓ Database '${dbName}' already exists\n`);
        }

        client.release();

        // 2. Connect to the new database
        console.log('📝 Applying schema...');
        const appPool = new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            database: dbName,
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD
        });

        const appClient = await appPool.connect();

        // 3. Read and execute schema
        const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');

        if (!fs.existsSync(schemaPath)) {
            throw new Error(`Schema file not found at ${schemaPath}`);
        }

        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        // Execute schema
        await appClient.query(schemaSql);

        console.log('   ✓ Schema applied successfully\n');

        // 4. Verify tables
        console.log('🔍 Verifying tables...');
        const tablesResult = await appClient.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        `);

        console.log(`   ✓ Created ${tablesResult.rows.length} tables:`);
        tablesResult.rows.forEach(row => {
            console.log(`     - ${row.table_name}`);
        });
        console.log();

        // 5. Verify functions
        console.log('🔧 Verifying functions...');
        const functionsResult = await appClient.query(`
            SELECT routine_name
            FROM information_schema.routines
            WHERE routine_schema = 'public'
            AND routine_type = 'FUNCTION'
            ORDER BY routine_name
        `);

        console.log(`   ✓ Created ${functionsResult.rows.length} functions:`);
        functionsResult.rows.forEach(row => {
            console.log(`     - ${row.routine_name}`);
        });
        console.log();

        // 6. Verify views
        console.log('👁️  Verifying views...');
        const viewsResult = await appClient.query(`
            SELECT table_name
            FROM information_schema.views
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);

        console.log(`   ✓ Created ${viewsResult.rows.length} views:`);
        viewsResult.rows.forEach(row => {
            console.log(`     - ${row.table_name}`);
        });
        console.log();

        appClient.release();
        await appPool.end();

        console.log('═══════════════════════════════════════════════════════');
        console.log('✅ DATABASE SETUP COMPLETED SUCCESSFULLY!');
        console.log('═══════════════════════════════════════════════════════');
        console.log(`   Database: ${dbName}`);
        console.log(`   Host: ${process.env.DB_HOST || 'localhost'}`);
        console.log(`   Port: ${process.env.DB_PORT || 5432}`);
        console.log('═══════════════════════════════════════════════════════\n');
        console.log('📋 NEXT STEPS:');
        console.log('   1. Run seed script: npm run db:seed');
        console.log('   2. Start server: npm run dev');
        console.log('═══════════════════════════════════════════════════════\n');

    } catch (error) {
        console.error('❌ Error setting up database:', error);
        throw error;
    } finally {
        await systemPool.end();
    }
}

// Run setup
setupDatabase()
    .then(() => {
        console.log('✓ Setup process completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('✗ Setup process failed:', error);
        process.exit(1);
    });
