-- =====================================================
-- GAMIFIED LEARNING LEADERBOARD DATABASE SCHEMA
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- USERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    avatar_url VARCHAR(500),
    total_points INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_date DATE,
    join_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    is_banned BOOLEAN DEFAULT false,
    ban_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for users
CREATE INDEX idx_users_total_points ON users(total_points DESC);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_active ON users(is_active);

-- =====================================================
-- TASKS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    difficulty VARCHAR(20) CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert')),
    base_points INTEGER NOT NULL,
    time_limit_minutes INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for tasks
CREATE INDEX idx_tasks_category ON tasks(category);
CREATE INDEX idx_tasks_difficulty ON tasks(difficulty);
CREATE INDEX idx_tasks_is_active ON tasks(is_active);

-- =====================================================
-- USER TASK COMPLETIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_task_completions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    points_earned INTEGER NOT NULL,
    time_taken_seconds INTEGER,
    completion_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_valid BOOLEAN DEFAULT true,
    flagged_for_review BOOLEAN DEFAULT false,
    review_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, task_id, completion_date)
);

-- Create indexes for user_task_completions
CREATE INDEX idx_utc_user_id ON user_task_completions(user_id);
CREATE INDEX idx_utc_task_id ON user_task_completions(task_id);
CREATE INDEX idx_utc_completion_date ON user_task_completions(completion_date DESC);
CREATE INDEX idx_utc_flagged ON user_task_completions(flagged_for_review);

-- =====================================================
-- SCORE HISTORY TABLE (for tracking point changes)
-- =====================================================
CREATE TABLE IF NOT EXISTS score_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    points_change INTEGER NOT NULL,
    points_after INTEGER NOT NULL,
    reason VARCHAR(100),
    task_completion_id UUID REFERENCES user_task_completions(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for score_history
CREATE INDEX idx_score_history_user_id ON score_history(user_id);
CREATE INDEX idx_score_history_created_at ON score_history(created_at DESC);

-- =====================================================
-- STREAKS TABLE (daily activity tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS streaks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    streak_date DATE NOT NULL,
    tasks_completed INTEGER DEFAULT 0,
    points_earned INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, streak_date)
);

-- Create indexes for streaks
CREATE INDEX idx_streaks_user_id ON streaks(user_id);
CREATE INDEX idx_streaks_date ON streaks(streak_date DESC);

-- =====================================================
-- FRIEND GROUPS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS friend_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT false,
    invite_code VARCHAR(20) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for friend_groups
CREATE INDEX idx_friend_groups_created_by ON friend_groups(created_by);
CREATE INDEX idx_friend_groups_invite_code ON friend_groups(invite_code);

-- =====================================================
-- GROUP MEMBERSHIPS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS group_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES friend_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, user_id)
);

-- Create indexes for group_memberships
CREATE INDEX idx_group_memberships_group_id ON group_memberships(group_id);
CREATE INDEX idx_group_memberships_user_id ON group_memberships(user_id);

-- =====================================================
-- RANK CHANGE NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS rank_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    old_rank INTEGER,
    new_rank INTEGER,
    rank_change INTEGER,
    group_id UUID REFERENCES friend_groups(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for rank_notifications
CREATE INDEX idx_rank_notifications_user_id ON rank_notifications(user_id);
CREATE INDEX idx_rank_notifications_is_read ON rank_notifications(is_read);
CREATE INDEX idx_rank_notifications_created_at ON rank_notifications(created_at DESC);

-- =====================================================
-- CHEAT DETECTION LOGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS cheat_detection_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_completion_id UUID REFERENCES user_task_completions(id) ON DELETE CASCADE,
    detection_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT NOT NULL,
    confidence_score DECIMAL(3,2),
    action_taken VARCHAR(50),
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,
    is_resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for cheat_detection_logs
CREATE INDEX idx_cheat_detection_user_id ON cheat_detection_logs(user_id);
CREATE INDEX idx_cheat_detection_severity ON cheat_detection_logs(severity);
CREATE INDEX idx_cheat_detection_is_resolved ON cheat_detection_logs(is_resolved);

-- =====================================================
-- USER SESSIONS TABLE (for concurrent access tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(500) NOT NULL UNIQUE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for user_sessions
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);

-- =====================================================
-- PERFORMANCE METRICS TABLE (for analytics)
-- =====================================================
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,
    tasks_completed INTEGER DEFAULT 0,
    points_earned INTEGER DEFAULT 0,
    average_time_per_task DECIMAL(10,2),
    accuracy_rate DECIMAL(5,2),
    categories_active TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, metric_date)
);

-- Create indexes for performance_metrics
CREATE INDEX idx_performance_metrics_user_id ON performance_metrics(user_id);
CREATE INDEX idx_performance_metrics_date ON performance_metrics(metric_date DESC);

-- =====================================================
-- MATERIALIZED VIEW FOR GLOBAL RANKINGS
-- (Updated periodically for performance)
-- =====================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS global_rankings AS
SELECT
    u.id,
    u.username,
    u.display_name,
    u.avatar_url,
    u.total_points,
    u.current_streak,
    u.longest_streak,
    RANK() OVER (ORDER BY u.total_points DESC, u.current_streak DESC) as global_rank,
    DENSE_RANK() OVER (ORDER BY u.total_points DESC, u.current_streak DESC) as dense_rank,
    COUNT(*) OVER () as total_users
FROM users u
WHERE u.is_active = true AND u.is_banned = false
ORDER BY u.total_points DESC, u.current_streak DESC;

-- Create index on materialized view
CREATE UNIQUE INDEX idx_global_rankings_id ON global_rankings(id);
CREATE INDEX idx_global_rankings_rank ON global_rankings(global_rank);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to update user's total points
CREATE OR REPLACE FUNCTION update_user_points()
RETURNS TRIGGER AS $$
BEGIN
    -- Update user's total points
    UPDATE users
    SET total_points = total_points + NEW.points_earned,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.user_id;

    -- Insert into score history
    INSERT INTO score_history (user_id, points_change, points_after, reason, task_completion_id)
    SELECT NEW.user_id, NEW.points_earned, u.total_points, 'Task completion', NEW.id
    FROM users u
    WHERE u.id = NEW.user_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update streak
CREATE OR REPLACE FUNCTION update_user_streak(p_user_id UUID, p_completion_date DATE)
RETURNS VOID AS $$
DECLARE
    v_last_activity DATE;
    v_current_streak INTEGER;
    v_longest_streak INTEGER;
BEGIN
    -- Get user's last activity date and current streak
    SELECT last_activity_date, current_streak, longest_streak
    INTO v_last_activity, v_current_streak, v_longest_streak
    FROM users
    WHERE id = p_user_id;

    -- Update streak logic
    IF v_last_activity IS NULL OR v_last_activity < p_completion_date - INTERVAL '1 day' THEN
        -- Streak broken or first activity
        v_current_streak := 1;
    ELSIF v_last_activity = p_completion_date - INTERVAL '1 day' THEN
        -- Continue streak
        v_current_streak := v_current_streak + 1;
    ELSIF v_last_activity = p_completion_date THEN
        -- Same day, no change
        RETURN;
    END IF;

    -- Update longest streak if necessary
    IF v_current_streak > v_longest_streak THEN
        v_longest_streak := v_current_streak;
    END IF;

    -- Update user
    UPDATE users
    SET current_streak = v_current_streak,
        longest_streak = v_longest_streak,
        last_activity_date = p_completion_date,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_user_id;

    -- Insert/Update streak record
    INSERT INTO streaks (user_id, streak_date, tasks_completed, points_earned)
    VALUES (p_user_id, p_completion_date, 1, 0)
    ON CONFLICT (user_id, streak_date)
    DO UPDATE SET tasks_completed = streaks.tasks_completed + 1;
END;
$$ LANGUAGE plpgsql;

-- Function to check for rank change and create notification
CREATE OR REPLACE FUNCTION check_rank_change(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_new_rank INTEGER;
    v_old_rank INTEGER;
    v_username VARCHAR(50);
BEGIN
    -- Get new rank
    SELECT global_rank INTO v_new_rank
    FROM global_rankings
    WHERE id = p_user_id;

    -- Get old rank from last notification or score history
    SELECT new_rank INTO v_old_rank
    FROM rank_notifications
    WHERE user_id = p_user_id
    ORDER BY created_at DESC
    LIMIT 1;

    -- If no previous rank, set to new rank + 1
    IF v_old_rank IS NULL THEN
        v_old_rank := v_new_rank + 1;
    END IF;

    -- Check if rank changed significantly (more than 10 positions or entered top 100)
    IF ABS(v_new_rank - v_old_rank) >= 10 OR (v_new_rank <= 100 AND v_old_rank > 100) THEN
        SELECT username INTO v_username FROM users WHERE id = p_user_id;

        INSERT INTO rank_notifications (
            user_id,
            notification_type,
            title,
            message,
            old_rank,
            new_rank,
            rank_change
        ) VALUES (
            p_user_id,
            'rank_change',
            'Rank Update!',
            format('Your rank changed from #%s to #%s', v_old_rank, v_new_rank),
            v_old_rank,
            v_new_rank,
            v_old_rank - v_new_rank
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger to update points when task is completed
CREATE TRIGGER trigger_update_points
AFTER INSERT ON user_task_completions
FOR EACH ROW
WHEN (NEW.is_valid = true)
EXECUTE FUNCTION update_user_points();

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_timestamp
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_tasks_timestamp
BEFORE UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_friend_groups_timestamp
BEFORE UPDATE ON friend_groups
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();
