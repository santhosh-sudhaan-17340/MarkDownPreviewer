-- Gamified Learning Leaderboard Database Schema
-- PostgreSQL 14+

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(500),
    total_points INTEGER DEFAULT 0 NOT NULL,
    global_rank INTEGER,
    current_streak INTEGER DEFAULT 0 NOT NULL,
    longest_streak INTEGER DEFAULT 0 NOT NULL,
    last_activity_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    is_banned BOOLEAN DEFAULT false,
    CONSTRAINT positive_points CHECK (total_points >= 0),
    CONSTRAINT positive_streaks CHECK (current_streak >= 0 AND longest_streak >= 0)
);

CREATE INDEX idx_users_total_points ON users(total_points DESC, created_at ASC);
CREATE INDEX idx_users_username ON users USING gin(username gin_trgm_ops);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_last_activity ON users(last_activity_date DESC);

-- ============================================================
-- TASKS TABLE
-- ============================================================
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced', 'expert')),
    base_points INTEGER NOT NULL,
    bonus_points INTEGER DEFAULT 0,
    time_limit_minutes INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT positive_points_task CHECK (base_points > 0 AND bonus_points >= 0)
);

CREATE INDEX idx_tasks_category ON tasks(category);
CREATE INDEX idx_tasks_difficulty ON tasks(difficulty);
CREATE INDEX idx_tasks_active ON tasks(is_active) WHERE is_active = true;

-- ============================================================
-- TASK COMPLETIONS TABLE (with concurrency control)
-- ============================================================
CREATE TABLE task_completions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    points_earned INTEGER NOT NULL,
    completion_time_seconds INTEGER,
    accuracy_percentage DECIMAL(5, 2),
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    version INTEGER DEFAULT 1 NOT NULL,
    is_valid BOOLEAN DEFAULT true,
    flagged_for_review BOOLEAN DEFAULT false,
    UNIQUE(user_id, task_id),
    CONSTRAINT positive_completion_points CHECK (points_earned >= 0)
);

CREATE INDEX idx_task_completions_user ON task_completions(user_id, completed_at DESC);
CREATE INDEX idx_task_completions_task ON task_completions(task_id, completed_at DESC);
CREATE INDEX idx_task_completions_flagged ON task_completions(flagged_for_review) WHERE flagged_for_review = true;
CREATE INDEX idx_task_completions_completed_at ON task_completions(completed_at DESC);

-- ============================================================
-- SCORE UPDATES LOG (for history and rollback)
-- ============================================================
CREATE TABLE score_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_completion_id UUID REFERENCES task_completions(id) ON DELETE SET NULL,
    points_delta INTEGER NOT NULL,
    points_before INTEGER NOT NULL,
    points_after INTEGER NOT NULL,
    update_type VARCHAR(50) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_score_updates_user ON score_updates(user_id, created_at DESC);
CREATE INDEX idx_score_updates_created_at ON score_updates(created_at DESC);

-- ============================================================
-- STREAKS TABLE
-- ============================================================
CREATE TABLE streak_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    streak_date DATE NOT NULL,
    tasks_completed INTEGER DEFAULT 0,
    points_earned INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(user_id, streak_date)
);

CREATE INDEX idx_streak_history_user_date ON streak_history(user_id, streak_date DESC);
CREATE INDEX idx_streak_history_active ON streak_history(is_active, streak_date DESC);

-- ============================================================
-- FRIEND GROUPS TABLE
-- ============================================================
CREATE TABLE friend_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_friend_groups_created_by ON friend_groups(created_by);
CREATE INDEX idx_friend_groups_public ON friend_groups(is_public) WHERE is_public = true;

-- ============================================================
-- GROUP MEMBERSHIPS TABLE
-- ============================================================
CREATE TABLE group_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES friend_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

CREATE INDEX idx_group_memberships_group ON group_memberships(group_id, joined_at DESC);
CREATE INDEX idx_group_memberships_user ON group_memberships(user_id, joined_at DESC);

-- ============================================================
-- CACHED RANKINGS (for performance)
-- ============================================================
CREATE TABLE cached_rankings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID REFERENCES friend_groups(id) ON DELETE CASCADE,
    rank INTEGER NOT NULL,
    total_points INTEGER NOT NULL,
    rank_change INTEGER DEFAULT 0,
    percentile DECIMAL(5, 2),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, group_id)
);

CREATE INDEX idx_cached_rankings_user ON cached_rankings(user_id);
CREATE INDEX idx_cached_rankings_group ON cached_rankings(group_id, rank ASC);
CREATE INDEX idx_cached_rankings_global ON cached_rankings(rank ASC) WHERE group_id IS NULL;

-- ============================================================
-- PERFORMANCE METRICS TABLE
-- ============================================================
CREATE TABLE performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,
    tasks_completed INTEGER DEFAULT 0,
    points_earned INTEGER DEFAULT 0,
    avg_accuracy DECIMAL(5, 2),
    avg_completion_time_seconds INTEGER,
    categories_attempted JSONB,
    streak_maintained BOOLEAN DEFAULT false,
    UNIQUE(user_id, metric_date)
);

CREATE INDEX idx_performance_metrics_user ON performance_metrics(user_id, metric_date DESC);
CREATE INDEX idx_performance_metrics_date ON performance_metrics(metric_date DESC);

-- ============================================================
-- CHEAT DETECTION LOGS TABLE
-- ============================================================
CREATE TABLE cheat_detection_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_completion_id UUID REFERENCES task_completions(id) ON DELETE SET NULL,
    detection_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT NOT NULL,
    evidence JSONB,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'confirmed', 'dismissed')),
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    action_taken VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_cheat_detection_user ON cheat_detection_logs(user_id, created_at DESC);
CREATE INDEX idx_cheat_detection_status ON cheat_detection_logs(status, severity DESC);
CREATE INDEX idx_cheat_detection_severity ON cheat_detection_logs(severity, created_at DESC);

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_type ON notifications(type, created_at DESC);

-- ============================================================
-- ACHIEVEMENTS TABLE
-- ============================================================
CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    icon_url VARCHAR(500),
    points_reward INTEGER DEFAULT 0,
    criteria JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_achievements_category ON achievements(category);
CREATE INDEX idx_achievements_active ON achievements(is_active) WHERE is_active = true;

-- ============================================================
-- USER ACHIEVEMENTS TABLE
-- ============================================================
CREATE TABLE user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user ON user_achievements(user_id, unlocked_at DESC);
CREATE INDEX idx_user_achievements_achievement ON user_achievements(achievement_id, unlocked_at DESC);

-- ============================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update timestamp triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_friend_groups_updated_at BEFORE UPDATE ON friend_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update user's total points
CREATE OR REPLACE FUNCTION update_user_points(
    p_user_id UUID,
    p_points_delta INTEGER,
    p_update_type VARCHAR,
    p_task_completion_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS TABLE (
    new_total_points INTEGER,
    old_rank INTEGER,
    new_rank INTEGER
) AS $$
DECLARE
    v_old_points INTEGER;
    v_new_points INTEGER;
    v_old_rank INTEGER;
    v_new_rank INTEGER;
BEGIN
    -- Lock the user row for update
    SELECT total_points, global_rank INTO v_old_points, v_old_rank
    FROM users
    WHERE id = p_user_id
    FOR UPDATE;

    -- Calculate new points
    v_new_points := v_old_points + p_points_delta;

    -- Update user's points
    UPDATE users
    SET total_points = v_new_points,
        updated_at = NOW()
    WHERE id = p_user_id;

    -- Log the score update
    INSERT INTO score_updates (user_id, task_completion_id, points_delta, points_before, points_after, update_type, metadata)
    VALUES (p_user_id, p_task_completion_id, p_points_delta, v_old_points, v_new_points, p_update_type, p_metadata);

    -- Calculate new rank (this is expensive, so we'll cache it)
    SELECT COUNT(*) + 1 INTO v_new_rank
    FROM users
    WHERE total_points > v_new_points AND is_active = true;

    RETURN QUERY SELECT v_new_points, v_old_rank, v_new_rank;
END;
$$ LANGUAGE plpgsql;

-- Function to update streak
CREATE OR REPLACE FUNCTION update_user_streak(p_user_id UUID)
RETURNS TABLE (
    current_streak INTEGER,
    longest_streak INTEGER,
    streak_maintained BOOLEAN
) AS $$
DECLARE
    v_last_activity DATE;
    v_current_streak INTEGER;
    v_longest_streak INTEGER;
    v_today DATE := CURRENT_DATE;
    v_streak_maintained BOOLEAN;
BEGIN
    -- Get user's last activity date and current streak
    SELECT last_activity_date, users.current_streak, users.longest_streak
    INTO v_last_activity, v_current_streak, v_longest_streak
    FROM users
    WHERE id = p_user_id;

    -- Determine streak status
    IF v_last_activity IS NULL OR v_last_activity < v_today - INTERVAL '1 day' THEN
        -- Streak broken, reset to 1
        v_current_streak := 1;
        v_streak_maintained := false;
    ELSIF v_last_activity = v_today - INTERVAL '1 day' THEN
        -- Consecutive day, increment streak
        v_current_streak := v_current_streak + 1;
        v_streak_maintained := true;
    ELSIF v_last_activity = v_today THEN
        -- Already updated today, maintain streak
        v_streak_maintained := true;
    END IF;

    -- Update longest streak if necessary
    IF v_current_streak > v_longest_streak THEN
        v_longest_streak := v_current_streak;
    END IF;

    -- Update user record
    UPDATE users
    SET current_streak = v_current_streak,
        longest_streak = v_longest_streak,
        last_activity_date = v_today,
        updated_at = NOW()
    WHERE id = p_user_id;

    -- Record in streak history
    INSERT INTO streak_history (user_id, streak_date, is_active)
    VALUES (p_user_id, v_today, true)
    ON CONFLICT (user_id, streak_date)
    DO UPDATE SET is_active = true;

    RETURN QUERY SELECT v_current_streak, v_longest_streak, v_streak_maintained;
END;
$$ LANGUAGE plpgsql;

-- Function to get global rankings with window functions (optimized)
CREATE OR REPLACE FUNCTION get_global_rankings(
    p_limit INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    rank BIGINT,
    user_id UUID,
    username VARCHAR,
    display_name VARCHAR,
    avatar_url VARCHAR,
    total_points INTEGER,
    current_streak INTEGER,
    rank_change INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH ranked_users AS (
        SELECT
            DENSE_RANK() OVER (ORDER BY u.total_points DESC, u.created_at ASC) AS rank,
            u.id,
            u.username,
            u.display_name,
            u.avatar_url,
            u.total_points,
            u.current_streak,
            COALESCE(cr.rank_change, 0) AS rank_change
        FROM users u
        LEFT JOIN cached_rankings cr ON cr.user_id = u.id AND cr.group_id IS NULL
        WHERE u.is_active = true AND u.is_banned = false
    )
    SELECT * FROM ranked_users
    ORDER BY rank ASC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Function to get group rankings
CREATE OR REPLACE FUNCTION get_group_rankings(
    p_group_id UUID,
    p_limit INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    rank BIGINT,
    user_id UUID,
    username VARCHAR,
    display_name VARCHAR,
    avatar_url VARCHAR,
    total_points INTEGER,
    current_streak INTEGER,
    rank_change INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH group_users AS (
        SELECT u.id, u.username, u.display_name, u.avatar_url, u.total_points, u.current_streak
        FROM users u
        INNER JOIN group_memberships gm ON gm.user_id = u.id
        WHERE gm.group_id = p_group_id AND u.is_active = true AND u.is_banned = false
    ),
    ranked_users AS (
        SELECT
            DENSE_RANK() OVER (ORDER BY gu.total_points DESC) AS rank,
            gu.id,
            gu.username,
            gu.display_name,
            gu.avatar_url,
            gu.total_points,
            gu.current_streak,
            COALESCE(cr.rank_change, 0) AS rank_change
        FROM group_users gu
        LEFT JOIN cached_rankings cr ON cr.user_id = gu.id AND cr.group_id = p_group_id
    )
    SELECT * FROM ranked_users
    ORDER BY rank ASC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE users IS 'Stores student user information and aggregate stats';
COMMENT ON TABLE tasks IS 'Learning tasks that students can complete';
COMMENT ON TABLE task_completions IS 'Records of task completions with concurrency version control';
COMMENT ON TABLE score_updates IS 'Audit log of all point changes';
COMMENT ON TABLE streak_history IS 'Daily activity tracking for streak calculation';
COMMENT ON TABLE friend_groups IS 'Groups for friend-based leaderboards';
COMMENT ON TABLE cached_rankings IS 'Materialized ranking cache for performance';
COMMENT ON TABLE cheat_detection_logs IS 'Logs of detected anomalous behavior';
COMMENT ON TABLE notifications IS 'User notifications for rank changes and achievements';
