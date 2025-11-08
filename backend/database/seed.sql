-- Sample Data Seed Script for Gamified Learning Leaderboard
-- Run this after schema.sql to populate the database with test data

-- Sample Tasks
INSERT INTO tasks (title, description, category, difficulty, base_points, bonus_points, time_limit_minutes) VALUES
('Introduction to Variables', 'Learn about variables and data types in programming', 'programming', 'beginner', 50, 10, 30),
('Basic Loops', 'Master for and while loops', 'programming', 'beginner', 60, 15, 45),
('Functions and Methods', 'Understand how to create and use functions', 'programming', 'intermediate', 100, 20, 60),
('Object-Oriented Programming', 'Learn OOP concepts: classes, objects, inheritance', 'programming', 'intermediate', 150, 30, 90),
('Data Structures: Arrays', 'Work with arrays and array operations', 'programming', 'intermediate', 120, 25, 75),
('Algorithms: Sorting', 'Implement common sorting algorithms', 'programming', 'advanced', 200, 50, 120),
('Design Patterns', 'Learn common software design patterns', 'programming', 'advanced', 250, 60, 150),
('System Architecture', 'Design scalable system architectures', 'programming', 'expert', 400, 100, 240),

('Basic Arithmetic', 'Addition, subtraction, multiplication, division', 'mathematics', 'beginner', 40, 10, 20),
('Algebra Fundamentals', 'Learn algebraic expressions and equations', 'mathematics', 'beginner', 70, 15, 40),
('Geometry Basics', 'Understanding shapes, angles, and measurements', 'mathematics', 'intermediate', 90, 20, 50),
('Calculus Introduction', 'Limits, derivatives, and integrals', 'mathematics', 'advanced', 180, 40, 100),
('Linear Algebra', 'Matrices, vectors, and transformations', 'mathematics', 'advanced', 220, 50, 120),

('HTML Basics', 'Create your first HTML page', 'web-development', 'beginner', 50, 10, 30),
('CSS Styling', 'Style web pages with CSS', 'web-development', 'beginner', 60, 15, 45),
('JavaScript Fundamentals', 'Learn JavaScript programming basics', 'web-development', 'intermediate', 100, 20, 60),
('Responsive Design', 'Build mobile-friendly websites', 'web-development', 'intermediate', 130, 25, 75),
('React Components', 'Build reusable React components', 'web-development', 'advanced', 200, 50, 120),
('Full-Stack Application', 'Create a complete web application', 'web-development', 'expert', 500, 120, 300),

('Database Basics', 'Introduction to relational databases', 'database', 'beginner', 80, 15, 40),
('SQL Queries', 'Write SELECT, INSERT, UPDATE, DELETE queries', 'database', 'intermediate', 120, 25, 60),
('Database Design', 'Design normalized database schemas', 'database', 'advanced', 180, 40, 90),
('Query Optimization', 'Optimize slow database queries', 'database', 'advanced', 200, 50, 100);

-- Sample Achievements
INSERT INTO achievements (name, description, category, points_reward, criteria) VALUES
('First Step', 'Complete your first task', 'milestones', 10, '{"tasks_completed": 1}'),
('Getting Started', 'Complete 10 tasks', 'milestones', 50, '{"tasks_completed": 10}'),
('Task Master', 'Complete 50 tasks', 'milestones', 250, '{"tasks_completed": 50}'),
('Century Club', 'Complete 100 tasks', 'milestones', 500, '{"tasks_completed": 100}'),
('Dedicated Learner', 'Maintain a 7-day streak', 'streaks', 100, '{"streak_days": 7}'),
('Committed Student', 'Maintain a 30-day streak', 'streaks', 500, '{"streak_days": 30}'),
('Unstoppable', 'Maintain a 100-day streak', 'streaks', 2000, '{"streak_days": 100}'),
('Perfect Score', 'Achieve 100% accuracy on a task', 'performance', 50, '{"accuracy": 100}'),
('Speed Demon', 'Complete a task in under 50% of time limit', 'performance', 75, '{"time_percentage": 50}'),
('Point Collector', 'Earn 1000 total points', 'points', 100, '{"total_points": 1000}'),
('Point Hoarder', 'Earn 10000 total points', 'points', 1000, '{"total_points": 10000}'),
('Top 10', 'Reach top 10 in global rankings', 'rankings', 500, '{"global_rank": 10}'),
('Champion', 'Reach #1 in global rankings', 'rankings', 2000, '{"global_rank": 1}'),
('Category Expert', 'Complete all tasks in a category', 'expertise', 300, '{"category_completion": true}'),
('Well Rounded', 'Complete tasks in 5 different categories', 'diversity', 200, '{"categories_count": 5}');

-- Notes about seed data:
-- 1. Users are not pre-seeded - they register through the API
-- 2. Task completions are created when users complete tasks
-- 3. Groups are created by users through the API
-- 4. This provides a good starting set of tasks and achievements
-- 5. Adjust points and time limits based on your use case

-- Verify seed data
DO $$
DECLARE
    task_count INTEGER;
    achievement_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO task_count FROM tasks;
    SELECT COUNT(*) INTO achievement_count FROM achievements;

    RAISE NOTICE 'Seed data loaded successfully!';
    RAISE NOTICE 'Tasks created: %', task_count;
    RAISE NOTICE 'Achievements created: %', achievement_count;
END $$;
