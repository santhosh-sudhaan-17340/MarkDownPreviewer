require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'parcel_locker_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD
});

async function seedData() {
    const client = await pool.connect();

    try {
        console.log('🌱 Starting database seeding...\n');

        // Check if data already exists
        const checkResult = await client.query('SELECT COUNT(*) FROM users');
        if (parseInt(checkResult.rows[0].count) > 0) {
            console.log('⚠️  Database already contains data. Skipping seed.');
            return;
        }

        // 1. Create admin user
        console.log('👤 Creating admin user...');
        const adminPasswordHash = await bcrypt.hash('admin123', 10);
        const adminResult = await client.query(
            `INSERT INTO users (email, password_hash, full_name, phone, role)
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            ['admin@parcelLocker.com', adminPasswordHash, 'System Administrator', '+1234567890', 'SUPER_ADMIN']
        );
        const adminId = adminResult.rows[0].id;
        console.log(`✓ Admin user created: admin@parcelLocker.com / admin123\n`);

        // 2. Create sample customer users
        console.log('👥 Creating sample users...');
        const customerPasswordHash = await bcrypt.hash('password123', 10);
        const users = [
            ['john.doe@email.com', 'John Doe', '+1234567891'],
            ['jane.smith@email.com', 'Jane Smith', '+1234567892'],
            ['bob.wilson@email.com', 'Bob Wilson', '+1234567893']
        ];

        const userIds = [];
        for (const [email, name, phone] of users) {
            const result = await client.query(
                `INSERT INTO users (email, password_hash, full_name, phone, role)
                 VALUES ($1, $2, $3, $4, 'CUSTOMER') RETURNING id`,
                [email, customerPasswordHash, name, phone]
            );
            userIds.push(result.rows[0].id);
        }
        console.log(`✓ Created ${users.length} sample users\n`);

        // 3. Create locker locations
        console.log('📍 Creating locker locations...');
        const locations = [
            {
                name: 'Downtown Central Station',
                address: '123 Main Street',
                city: 'New York',
                postal_code: '10001',
                latitude: 40.7589,
                longitude: -73.9851,
                operating_hours: {
                    monday: { open: '06:00', close: '23:00' },
                    tuesday: { open: '06:00', close: '23:00' },
                    wednesday: { open: '06:00', close: '23:00' },
                    thursday: { open: '06:00', close: '23:00' },
                    friday: { open: '06:00', close: '23:00' },
                    saturday: { open: '08:00', close: '22:00' },
                    sunday: { open: '08:00', close: '22:00' }
                }
            },
            {
                name: 'Westside Shopping Mall',
                address: '456 Commerce Ave',
                city: 'New York',
                postal_code: '10025',
                latitude: 40.7812,
                longitude: -73.9665,
                operating_hours: {
                    monday: { open: '10:00', close: '21:00' },
                    tuesday: { open: '10:00', close: '21:00' },
                    wednesday: { open: '10:00', close: '21:00' },
                    thursday: { open: '10:00', close: '21:00' },
                    friday: { open: '10:00', close: '21:00' },
                    saturday: { open: '09:00', close: '22:00' },
                    sunday: { open: '10:00', close: '20:00' }
                }
            },
            {
                name: 'Airport Terminal 3',
                address: '789 Airport Blvd',
                city: 'New York',
                postal_code: '11430',
                latitude: 40.6413,
                longitude: -73.7781,
                operating_hours: {
                    monday: { open: '00:00', close: '23:59' },
                    tuesday: { open: '00:00', close: '23:59' },
                    wednesday: { open: '00:00', close: '23:59' },
                    thursday: { open: '00:00', close: '23:59' },
                    friday: { open: '00:00', close: '23:59' },
                    saturday: { open: '00:00', close: '23:59' },
                    sunday: { open: '00:00', close: '23:59' }
                }
            }
        ];

        const locationIds = [];
        for (const loc of locations) {
            const result = await client.query(
                `INSERT INTO locker_locations (name, address, city, postal_code, latitude, longitude, operating_hours)
                 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
                [loc.name, loc.address, loc.city, loc.postal_code, loc.latitude, loc.longitude, JSON.stringify(loc.operating_hours)]
            );
            locationIds.push(result.rows[0].id);
        }
        console.log(`✓ Created ${locations.length} locker locations\n`);

        // 4. Create lockers at each location
        console.log('🏢 Creating lockers...');
        const lockersPerLocation = [3, 2, 2]; // Different number of lockers per location
        const lockerIds = [];

        for (let i = 0; i < locationIds.length; i++) {
            for (let j = 1; j <= lockersPerLocation[i]; j++) {
                const result = await client.query(
                    `INSERT INTO lockers (location_id, locker_number, status, temperature_celsius, humidity_percent, firmware_version, last_maintenance, next_maintenance)
                     VALUES ($1, $2, 'ACTIVE', $3, $4, 'v2.1.0', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '60 days')
                     RETURNING id`,
                    [locationIds[i], `L${i + 1}${j}`, 20 + Math.random() * 5, 45 + Math.random() * 10]
                );
                lockerIds.push(result.rows[0].id);
            }
        }
        console.log(`✓ Created ${lockerIds.length} lockers\n`);

        // 5. Create slots for each locker
        console.log('📦 Creating locker slots...');
        const slotSizes = [
            { size: 'SMALL', width: 30, height: 30, depth: 40, weight: 5, count: 4 },
            { size: 'MEDIUM', width: 40, height: 40, depth: 50, weight: 10, count: 3 },
            { size: 'LARGE', width: 50, height: 50, depth: 60, weight: 20, count: 2 },
            { size: 'XLARGE', width: 60, height: 70, depth: 70, weight: 30, count: 1 }
        ];

        let totalSlots = 0;
        for (const lockerId of lockerIds) {
            let slotNum = 1;
            for (const slotSize of slotSizes) {
                for (let i = 0; i < slotSize.count; i++) {
                    await client.query(
                        `INSERT INTO locker_slots (locker_id, slot_number, size, width_cm, height_cm, depth_cm, max_weight_kg, status)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, 'AVAILABLE')`,
                        [lockerId, `S${slotNum.toString().padStart(2, '0')}`, slotSize.size, slotSize.width, slotSize.height, slotSize.depth, slotSize.weight]
                    );
                    slotNum++;
                    totalSlots++;
                }
            }
        }
        console.log(`✓ Created ${totalSlots} locker slots\n`);

        // 6. Create sample parcels
        console.log('📮 Creating sample parcels...');
        const parcelSamples = [
            {
                sender: userIds[0],
                senderName: 'John Doe',
                senderPhone: '+1234567891',
                recipient: userIds[1],
                recipientName: 'Jane Smith',
                recipientPhone: '+1234567892',
                recipientEmail: 'jane.smith@email.com',
                size: 'MEDIUM',
                weight: 2.5,
                status: 'PENDING'
            },
            {
                sender: userIds[1],
                senderName: 'Jane Smith',
                senderPhone: '+1234567892',
                recipient: userIds[2],
                recipientName: 'Bob Wilson',
                recipientPhone: '+1234567893',
                recipientEmail: 'bob.wilson@email.com',
                size: 'SMALL',
                weight: 1.0,
                status: 'PENDING'
            }
        ];

        for (const parcel of parcelSamples) {
            const trackingNumber = 'PKG' + Date.now() + Math.random().toString(36).substring(2, 8).toUpperCase();
            await client.query(
                `INSERT INTO parcels (tracking_number, sender_id, sender_name, sender_phone, recipient_id, recipient_name, recipient_phone, recipient_email, parcel_size, weight_kg, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                [trackingNumber, parcel.sender, parcel.senderName, parcel.senderPhone, parcel.recipient, parcel.recipientName, parcel.recipientPhone, parcel.recipientEmail, parcel.size, parcel.weight, parcel.status]
            );
        }
        console.log(`✓ Created ${parcelSamples.length} sample parcels\n`);

        // 7. Add some audit logs
        console.log('📝 Creating audit logs...');
        await client.query(
            `INSERT INTO audit_logs (entity_type, entity_id, action, performed_by, new_values)
             VALUES ('user', $1, 'CREATE', $1, '{"role": "SUPER_ADMIN"}')`,
            [adminId]
        );
        console.log('✓ Created audit logs\n');

        console.log('✅ Database seeding completed successfully!\n');
        console.log('═══════════════════════════════════════════════════════');
        console.log('📊 SUMMARY:');
        console.log('═══════════════════════════════════════════════════════');
        console.log(`   Users: ${users.length + 1} (${users.length} customers + 1 admin)`);
        console.log(`   Locations: ${locations.length}`);
        console.log(`   Lockers: ${lockerIds.length}`);
        console.log(`   Slots: ${totalSlots}`);
        console.log(`   Parcels: ${parcelSamples.length}`);
        console.log('═══════════════════════════════════════════════════════\n');
        console.log('🔐 ADMIN CREDENTIALS:');
        console.log('   Email: admin@parcelLocker.com');
        console.log('   Password: admin123');
        console.log('═══════════════════════════════════════════════════════\n');
        console.log('👤 CUSTOMER CREDENTIALS (all use password: password123):');
        users.forEach(([email]) => console.log(`   - ${email}`));
        console.log('═══════════════════════════════════════════════════════\n');

    } catch (error) {
        console.error('❌ Error seeding database:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run seed
seedData()
    .then(() => {
        console.log('✓ Seed process completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('✗ Seed process failed:', error);
        process.exit(1);
    });
