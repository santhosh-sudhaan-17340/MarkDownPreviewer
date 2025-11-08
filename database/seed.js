const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'ticketing_system',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});

async function seed() {
    const client = await pool.connect();

    try {
        console.log('Starting database seeding...');

        await client.query('BEGIN');

        // Seed Skills
        console.log('Seeding skills...');
        const skillsResult = await client.query(`
            INSERT INTO skills (name, description) VALUES
            ('Technical Support', 'General technical troubleshooting and support'),
            ('Billing', 'Billing inquiries and payment issues'),
            ('Account Management', 'Account setup, changes, and termination'),
            ('Product Issues', 'Product defects and functionality problems'),
            ('Network Issues', 'Network connectivity and performance'),
            ('Security', 'Security concerns and vulnerabilities'),
            ('API Support', 'API integration and development support')
            ON CONFLICT (name) DO NOTHING
            RETURNING id;
        `);
        console.log(`✓ Seeded ${skillsResult.rowCount} skills`);

        // Seed Categories
        console.log('Seeding categories...');
        await client.query(`
            INSERT INTO categories (name, description, required_skill_id, sla_response_minutes, sla_resolution_minutes) VALUES
            ('Technical Issue', 'Technical problems and bugs',
                (SELECT id FROM skills WHERE name = 'Technical Support'), 30, 240),
            ('Billing Problem', 'Billing and payment related issues',
                (SELECT id FROM skills WHERE name = 'Billing'), 60, 480),
            ('Account Help', 'Account management requests',
                (SELECT id FROM skills WHERE name = 'Account Management'), 60, 360),
            ('Product Defect', 'Product quality and defect reports',
                (SELECT id FROM skills WHERE name = 'Product Issues'), 15, 120),
            ('Network Problem', 'Network and connectivity issues',
                (SELECT id FROM skills WHERE name = 'Network Issues'), 20, 180),
            ('Security Concern', 'Security vulnerabilities and concerns',
                (SELECT id FROM skills WHERE name = 'Security'), 10, 60),
            ('API Integration', 'API and integration support',
                (SELECT id FROM skills WHERE name = 'API Support'), 45, 480)
            ON CONFLICT (name) DO NOTHING;
        `);
        console.log('✓ Seeded categories');

        // Seed Demo Agents
        console.log('Seeding demo agents...');
        const hashedPassword = await bcrypt.hash('demo123', 10);

        await client.query(`
            INSERT INTO agents (email, username, full_name, password_hash, phone, max_concurrent_tickets) VALUES
            ('john.doe@support.com', 'john.doe', 'John Doe', $1, '+1-555-0101', 15),
            ('jane.smith@support.com', 'jane.smith', 'Jane Smith', $1, '+1-555-0102', 12),
            ('bob.wilson@support.com', 'bob.wilson', 'Bob Wilson', $1, '+1-555-0103', 10),
            ('alice.brown@support.com', 'alice.brown', 'Alice Brown', $1, '+1-555-0104', 15),
            ('charlie.davis@support.com', 'charlie.davis', 'Charlie Davis', $1, '+1-555-0105', 8)
            ON CONFLICT (email) DO NOTHING;
        `, [hashedPassword]);
        console.log('✓ Seeded demo agents');

        // Assign skills to agents
        console.log('Assigning skills to agents...');
        await client.query(`
            INSERT INTO agent_skills (agent_id, skill_id, proficiency_level)
            SELECT a.id, s.id,
                CASE
                    WHEN random() < 0.3 THEN 5
                    WHEN random() < 0.6 THEN 4
                    ELSE 3
                END
            FROM agents a
            CROSS JOIN skills s
            WHERE random() < 0.6
            ON CONFLICT (agent_id, skill_id) DO NOTHING;
        `);
        console.log('✓ Assigned skills to agents');

        // Seed Demo Users
        console.log('Seeding demo users...');
        await client.query(`
            INSERT INTO users (email, username, full_name, password_hash, phone) VALUES
            ('user1@example.com', 'user1', 'Customer One', $1, '+1-555-1001'),
            ('user2@example.com', 'user2', 'Customer Two', $1, '+1-555-1002'),
            ('user3@example.com', 'user3', 'Customer Three', $1, '+1-555-1003'),
            ('user4@example.com', 'user4', 'Customer Four', $1, '+1-555-1004'),
            ('user5@example.com', 'user5', 'Customer Five', $1, '+1-555-1005')
            ON CONFLICT (email) DO NOTHING;
        `, [hashedPassword]);
        console.log('✓ Seeded demo users');

        // Seed SLA Policies
        console.log('Seeding SLA policies...');
        await client.query(`
            INSERT INTO sla_policies (name, description, response_time_minutes, resolution_time_minutes,
                escalation_enabled, escalation_threshold_minutes, applies_to_priority) VALUES
            ('Critical SLA', 'For critical priority tickets', 15, 120, true, 60, ARRAY['critical']),
            ('High Priority SLA', 'For high priority tickets', 30, 240, true, 120, ARRAY['high']),
            ('Standard SLA', 'For medium priority tickets', 60, 480, true, 360, ARRAY['medium']),
            ('Low Priority SLA', 'For low priority tickets', 120, 1440, false, NULL, ARRAY['low'])
            ON CONFLICT (name) DO NOTHING;
        `);
        console.log('✓ Seeded SLA policies');

        await client.query('COMMIT');
        console.log('✓ Database seeding completed successfully!');

        // Display summary
        const stats = await client.query(`
            SELECT
                (SELECT COUNT(*) FROM skills) as skills,
                (SELECT COUNT(*) FROM categories) as categories,
                (SELECT COUNT(*) FROM agents) as agents,
                (SELECT COUNT(*) FROM users) as users,
                (SELECT COUNT(*) FROM agent_skills) as agent_skills,
                (SELECT COUNT(*) FROM sla_policies) as sla_policies;
        `);

        console.log('\nDatabase Statistics:');
        console.log('-------------------');
        console.log(`Skills: ${stats.rows[0].skills}`);
        console.log(`Categories: ${stats.rows[0].categories}`);
        console.log(`Agents: ${stats.rows[0].agents}`);
        console.log(`Users: ${stats.rows[0].users}`);
        console.log(`Agent-Skill Mappings: ${stats.rows[0].agent_skills}`);
        console.log(`SLA Policies: ${stats.rows[0].sla_policies}`);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Seeding failed:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run seeding
if (require.main === module) {
    seed()
        .then(() => {
            console.log('\nSeeding completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Seeding failed:', error);
            process.exit(1);
        });
}

module.exports = { seed };
