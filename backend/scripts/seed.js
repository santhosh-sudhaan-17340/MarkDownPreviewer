const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'leaderboard_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
});

// Sample users
const sampleUsers = [
    { username: 'alice', email: 'alice@example.com', displayName: 'Alice Johnson', points: 5000 },
    { username: 'bob', email: 'bob@example.com', displayName: 'Bob Smith', points: 4500 },
    { username: 'charlie', email: 'charlie@example.com', displayName: 'Charlie Brown', points: 4200 },
    { username: 'diana', email: 'diana@example.com', displayName: 'Diana Prince', points: 3800 },
    { username: 'eve', email: 'eve@example.com', displayName: 'Eve Wilson', points: 3500 },
    { username: 'frank', email: 'frank@example.com', displayName: 'Frank Miller', points: 3200 },
    { username: 'grace', email: 'grace@example.com', displayName: 'Grace Lee', points: 2900 },
    { username: 'henry', email: 'henry@example.com', displayName: 'Henry Davis', points: 2600 },
    { username: 'ivy', email: 'ivy@example.com', displayName: 'Ivy Chen', points: 2300 },
    { username: 'jack', email: 'jack@example.com', displayName: 'Jack Robinson', points: 2000 },
];

// Sample tasks
const sampleTasks = [
    {
        title: 'Introduction to Variables',
        description: 'Learn about variables and data types in programming',
        category: 'Programming',
        difficulty: 'easy',
        basePoints: 100,
        timeLimitMinutes: 15
    },
    {
        title: 'Control Flow Basics',
        description: 'Master if-else statements and loops',
        category: 'Programming',
        difficulty: 'easy',
        basePoints: 150,
        timeLimitMinutes: 20
    },
    {
        title: 'Function Implementation',
        description: 'Create and use functions effectively',
        category: 'Programming',
        difficulty: 'medium',
        basePoints: 250,
        timeLimitMinutes: 30
    },
    {
        title: 'Object-Oriented Programming',
        description: 'Understand classes, objects, and inheritance',
        category: 'Programming',
        difficulty: 'medium',
        basePoints: 300,
        timeLimitMinutes: 45
    },
    {
        title: 'Algorithm Optimization',
        description: 'Optimize sorting and searching algorithms',
        category: 'Algorithms',
        difficulty: 'hard',
        basePoints: 500,
        timeLimitMinutes: 60
    },
    {
        title: 'Data Structures Deep Dive',
        description: 'Implement advanced data structures like trees and graphs',
        category: 'Data Structures',
        difficulty: 'hard',
        basePoints: 600,
        timeLimitMinutes: 90
    },
    {
        title: 'Database Design Challenge',
        description: 'Design a normalized database schema',
        category: 'Database',
        difficulty: 'medium',
        basePoints: 350,
        timeLimitMinutes: 40
    },
    {
        title: 'API Development',
        description: 'Build a RESTful API with proper authentication',
        category: 'Web Development',
        difficulty: 'hard',
        basePoints: 550,
        timeLimitMinutes: 120
    },
    {
        title: 'React Component Challenge',
        description: 'Create reusable React components with hooks',
        category: 'Web Development',
        difficulty: 'medium',
        basePoints: 300,
        timeLimitMinutes: 45
    },
    {
        title: 'Advanced Algorithms',
        description: 'Solve complex algorithmic problems',
        category: 'Algorithms',
        difficulty: 'expert',
        basePoints: 1000,
        timeLimitMinutes: 180
    },
    {
        title: 'CSS Flexbox Layout',
        description: 'Master flexbox for responsive layouts',
        category: 'Web Development',
        difficulty: 'easy',
        basePoints: 120,
        timeLimitMinutes: 25
    },
    {
        title: 'JavaScript Async/Await',
        description: 'Handle asynchronous operations with async/await',
        category: 'Programming',
        difficulty: 'medium',
        basePoints: 280,
        timeLimitMinutes: 35
    },
    {
        title: 'SQL Query Optimization',
        description: 'Optimize complex SQL queries for performance',
        category: 'Database',
        difficulty: 'hard',
        basePoints: 450,
        timeLimitMinutes: 60
    },
    {
        title: 'Security Best Practices',
        description: 'Implement authentication and authorization',
        category: 'Security',
        difficulty: 'hard',
        basePoints: 500,
        timeLimitMinutes: 75
    },
    {
        title: 'Testing with Jest',
        description: 'Write unit and integration tests',
        category: 'Testing',
        difficulty: 'medium',
        basePoints: 250,
        timeLimitMinutes: 40
    }
];

async function seedDatabase() {
    console.log('🌱 Starting database seeding...');

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Hash password for all users (using 'password123' for demo)
        const password = 'Password123!';
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        console.log('Creating users...');
        const userIds = [];

        for (const user of sampleUsers) {
            const result = await client.query(
                `INSERT INTO users (username, email, password_hash, display_name, total_points)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING id`,
                [user.username, user.email, passwordHash, user.displayName, user.points]
            );
            userIds.push(result.rows[0].id);
            console.log(`  ✓ Created user: ${user.username}`);
        }

        console.log('Creating tasks...');
        const taskIds = [];

        for (const task of sampleTasks) {
            const result = await client.query(
                `INSERT INTO tasks (title, description, category, difficulty, base_points, time_limit_minutes)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING id`,
                [task.title, task.description, task.category, task.difficulty, task.basePoints, task.timeLimitMinutes]
            );
            taskIds.push(result.rows[0].id);
            console.log(`  ✓ Created task: ${task.title}`);
        }

        console.log('Creating sample task completions...');
        // Create some random task completions
        for (let i = 0; i < 30; i++) {
            const userId = userIds[Math.floor(Math.random() * userIds.length)];
            const taskId = taskIds[Math.floor(Math.random() * taskIds.length)];
            const task = sampleTasks.find((t, idx) => taskIds[idx] === taskId);
            const timeTaken = Math.floor(Math.random() * (task.timeLimitMinutes * 60)) + 30;

            try {
                await client.query(
                    `INSERT INTO user_task_completions (user_id, task_id, points_earned, time_taken_seconds, completion_date)
                     VALUES ($1, $2, $3, $4, NOW() - INTERVAL '${Math.floor(Math.random() * 30)} days')
                     ON CONFLICT (user_id, task_id, completion_date) DO NOTHING`,
                    [userId, taskId, task.basePoints, timeTaken]
                );
            } catch (err) {
                // Ignore duplicate completions
            }
        }

        console.log('Creating sample friend group...');
        const groupResult = await client.query(
            `INSERT INTO friend_groups (name, description, created_by, is_public, invite_code)
             VALUES ('Study Buddies', 'A group for collaborative learning', $1, true, 'STUDY123')
             RETURNING id`,
            [userIds[0]]
        );

        const groupId = groupResult.rows[0].id;

        // Add some members to the group
        for (let i = 0; i < 5; i++) {
            await client.query(
                `INSERT INTO group_memberships (group_id, user_id, role)
                 VALUES ($1, $2, $3)`,
                [groupId, userIds[i], i === 0 ? 'owner' : 'member']
            );
        }

        console.log('Refreshing materialized views...');
        await client.query('REFRESH MATERIALIZED VIEW global_rankings');

        await client.query('COMMIT');

        console.log('\n✅ Database seeding completed successfully!');
        console.log('\n📝 Sample login credentials:');
        console.log('   Username: alice (or any other username from the list)');
        console.log('   Password: Password123!');
        console.log('\n🔑 Friend group invite code: STUDY123');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

// Run seeding
seedDatabase();
