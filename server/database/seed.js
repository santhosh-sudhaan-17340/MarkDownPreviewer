const pool = require('../config/database');
const bcrypt = require('bcryptjs');

async function seedDatabase() {
  const client = await pool.connect();

  try {
    console.log('Starting database seeding...');
    await client.query('BEGIN');

    // Create locker locations
    const locationResult = await client.query(`
      INSERT INTO locker_locations (name, address, city, state, postal_code, latitude, longitude, operating_hours)
      VALUES
        ('Downtown Hub', '123 Main St', 'San Francisco', 'CA', '94102', 37.7749, -122.4194, '{"open": "06:00", "close": "22:00"}'::jsonb),
        ('Airport Terminal', '456 Airport Blvd', 'San Francisco', 'CA', '94128', 37.6213, -122.3790, '{"open": "00:00", "close": "23:59"}'::jsonb),
        ('Shopping Mall', '789 Commerce Way', 'San Jose', 'CA', '95110', 37.3382, -121.8863, '{"open": "09:00", "close": "21:00"}'::jsonb),
        ('University Campus', '321 College Ave', 'Berkeley', 'CA', '94720', 37.8715, -122.2730, '{"open": "07:00", "close": "20:00"}'::jsonb),
        ('Transit Station', '555 Transit Plaza', 'Oakland', 'CA', '94607', 37.8044, -122.2712, '{"open": "05:00", "close": "23:00"}'::jsonb)
      RETURNING id
    `);

    const locationIds = locationResult.rows.map(row => row.id);
    console.log(`✓ Created ${locationIds.length} locker locations`);

    // Create locker slots for each location
    const slotSizes = ['small', 'medium', 'large', 'extra_large'];
    const slotCounts = {
      'small': 20,
      'medium': 15,
      'large': 10,
      'extra_large': 5
    };

    let totalSlots = 0;
    for (const locationId of locationIds) {
      let slotNumber = 1;
      for (const size of slotSizes) {
        for (let i = 0; i < slotCounts[size]; i++) {
          await client.query(`
            INSERT INTO locker_slots (locker_location_id, slot_number, size, status)
            VALUES ($1, $2, $3, 'available')
          `, [locationId, `S${String(slotNumber).padStart(3, '0')}`, size]);
          slotNumber++;
          totalSlots++;
        }
      }
    }
    console.log(`✓ Created ${totalSlots} locker slots`);

    // Create admin users
    const adminPassword = await bcrypt.hash('admin123', 10);
    const operatorPassword = await bcrypt.hash('operator123', 10);

    await client.query(`
      INSERT INTO admin_users (username, email, password_hash, role)
      VALUES
        ('admin', 'admin@parcellocker.com', $1, 'super_admin'),
        ('operator1', 'operator1@parcellocker.com', $2, 'operator'),
        ('operator2', 'operator2@parcellocker.com', $2, 'operator')
    `, [adminPassword, operatorPassword]);
    console.log('✓ Created admin users');

    // Create some test users
    const userPassword = await bcrypt.hash('user123', 10);
    await client.query(`
      INSERT INTO users (email, phone, first_name, last_name, password_hash)
      VALUES
        ('john.doe@email.com', '+1-555-0101', 'John', 'Doe', $1),
        ('jane.smith@email.com', '+1-555-0102', 'Jane', 'Smith', $1),
        ('bob.wilson@email.com', '+1-555-0103', 'Bob', 'Wilson', $1)
    `, [userPassword]);
    console.log('✓ Created test users');

    // Create some sample parcels (for demonstration)
    await client.query(`
      INSERT INTO parcels (tracking_number, recipient_name, recipient_email, recipient_phone, size, status)
      VALUES
        ('PKG001234567', 'John Doe', 'john.doe@email.com', '+1-555-0101', 'medium', 'pending'),
        ('PKG001234568', 'Jane Smith', 'jane.smith@email.com', '+1-555-0102', 'small', 'pending'),
        ('PKG001234569', 'Bob Wilson', 'bob.wilson@email.com', '+1-555-0103', 'large', 'pending')
    `);
    console.log('✓ Created sample parcels');

    await client.query('COMMIT');
    console.log('✓ Database seeding completed successfully');

    // Print login credentials
    console.log('\n=== Default Login Credentials ===');
    console.log('Admin:');
    console.log('  Username: admin');
    console.log('  Password: admin123');
    console.log('\nOperator:');
    console.log('  Username: operator1');
    console.log('  Password: operator123');
    console.log('\nTest User:');
    console.log('  Email: john.doe@email.com');
    console.log('  Password: user123');
    console.log('================================\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('✗ Seeding failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedDatabase().catch(err => {
  console.error(err);
  process.exit(1);
});
