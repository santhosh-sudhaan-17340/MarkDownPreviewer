// Study Tracker - Progress tracking across subjects
class StudyTracker {
    constructor() {
        this.sessions = [];
        this.goals = [];
        this.init();
    }

    init() {
        this.loadSessions();
    }

    loadSessions() {
        const saved = localStorage.getItem('studySessions');
        if (saved) {
            this.sessions = JSON.parse(saved);
        }
    }

    saveSessions() {
        localStorage.setItem('studySessions', JSON.stringify(this.sessions));
    }

    // Start a study session
    startSession(subjectId, type = 'focused') {
        const session = {
            id: Date.now().toString(),
            subjectId,
            type, // focused, review, practice
            startTime: new Date().toISOString(),
            endTime: null,
            duration: 0,
            tasksCompleted: 0,
            notes: '',
            active: true
        };

        this.sessions.push(session);
        this.saveSessions();
        return session.id;
    }

    // End a study session
    endSession(sessionId, tasksCompleted = 0, notes = '') {
        const session = this.sessions.find(s => s.id === sessionId);
        if (!session) return;

        session.endTime = new Date().toISOString();
        session.duration = (new Date(session.endTime) - new Date(session.startTime)) / 1000 / 60; // minutes
        session.tasksCompleted = tasksCompleted;
        session.notes = notes;
        session.active = false;

        // Update subject stats
        if (window.studyApp) {
            const subject = window.studyApp.data.subjects.find(s => s.id === session.subjectId);
            if (subject) {
                subject.hoursStudied += session.duration / 60;
                subject.tasksCompleted += tasksCompleted;
                subject.progress = Math.min((subject.hoursStudied / subject.targetHours) * 100, 100);
                window.studyApp.saveData();
            }

            // Update global stats
            window.studyApp.data.stats.studyTime += session.duration / 60;
            window.studyApp.data.stats.tasksCompleted += tasksCompleted;
            window.studyApp.saveData();
            window.studyApp.updateDashboard();
        }

        this.saveSessions();
    }

    // Get study statistics
    getStats(subjectId = null, days = 7) {
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        let filteredSessions = this.sessions.filter(s =>
            new Date(s.startTime) >= since && !s.active
        );

        if (subjectId) {
            filteredSessions = filteredSessions.filter(s => s.subjectId === subjectId);
        }

        const stats = {
            totalSessions: filteredSessions.length,
            totalMinutes: filteredSessions.reduce((sum, s) => sum + s.duration, 0),
            totalTasks: filteredSessions.reduce((sum, s) => sum + s.tasksCompleted, 0),
            averageSessionLength: 0,
            streak: 0,
            byDay: {}
        };

        stats.averageSessionLength = stats.totalSessions > 0 ?
            stats.totalMinutes / stats.totalSessions : 0;

        // Calculate streak
        let currentStreak = 0;
        let checkDate = new Date();
        const sessionDates = new Set(
            filteredSessions.map(s => new Date(s.startTime).toDateString())
        );

        while (sessionDates.has(checkDate.toDateString())) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
        }

        stats.streak = currentStreak;

        return stats;
    }

    // Get daily study data for charts
    getDailyData(days = 30) {
        const data = [];
        const today = new Date();

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toDateString();

            const daySessions = this.sessions.filter(s =>
                new Date(s.startTime).toDateString() === dateStr && !s.active
            );

            data.push({
                date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                minutes: daySessions.reduce((sum, s) => sum + s.duration, 0),
                sessions: daySessions.length
            });
        }

        return data;
    }

    // Get subject distribution
    getSubjectDistribution() {
        const distribution = {};

        this.sessions.forEach(session => {
            if (!session.active && session.subjectId) {
                if (!distribution[session.subjectId]) {
                    distribution[session.subjectId] = {
                        minutes: 0,
                        sessions: 0
                    };
                }
                distribution[session.subjectId].minutes += session.duration;
                distribution[session.subjectId].sessions += 1;
            }
        });

        return distribution;
    }

    // Goal Management
    setGoal(subjectId, type, target, deadline) {
        const goal = {
            id: Date.now().toString(),
            subjectId,
            type, // hours, tasks, progress
            target,
            current: 0,
            deadline: deadline,
            createdAt: new Date().toISOString(),
            completed: false
        };

        this.goals.push(goal);
        this.saveGoals();
        return goal.id;
    }

    saveGoals() {
        localStorage.setItem('studyGoals', JSON.stringify(this.goals));
    }

    loadGoals() {
        const saved = localStorage.getItem('studyGoals');
        if (saved) {
            this.goals = JSON.parse(saved);
        }
    }

    updateGoalProgress() {
        this.goals.forEach(goal => {
            if (goal.completed) return;

            const subject = window.studyApp?.data.subjects.find(s => s.id === goal.subjectId);
            if (!subject) return;

            switch (goal.type) {
                case 'hours':
                    goal.current = subject.hoursStudied;
                    break;
                case 'tasks':
                    goal.current = subject.tasksCompleted;
                    break;
                case 'progress':
                    goal.current = subject.progress;
                    break;
            }

            if (goal.current >= goal.target) {
                goal.completed = true;
                this.onGoalCompleted(goal);
            }
        });

        this.saveGoals();
    }

    onGoalCompleted(goal) {
        // Show notification or celebration
        console.log(`Goal completed: ${goal.type} goal of ${goal.target}!`);
    }

    // Get active goals
    getActiveGoals(subjectId = null) {
        let goals = this.goals.filter(g => !g.completed);

        if (subjectId) {
            goals = goals.filter(g => g.subjectId === subjectId);
        }

        return goals;
    }

    // Analytics
    getProductivityScore(days = 7) {
        const stats = this.getStats(null, days);
        const targetMinutesPerDay = 120; // 2 hours
        const targetDays = days;

        const timeScore = Math.min((stats.totalMinutes / (targetMinutesPerDay * targetDays)) * 50, 50);
        const consistencyScore = Math.min((stats.streak / targetDays) * 30, 30);
        const taskScore = Math.min((stats.totalTasks / (targetDays * 3)) * 20, 20);

        return Math.round(timeScore + consistencyScore + taskScore);
    }

    // Recommendations
    getRecommendations() {
        const recommendations = [];
        const stats = this.getStats(null, 7);

        if (stats.averageSessionLength < 25) {
            recommendations.push({
                type: 'duration',
                message: 'Try longer study sessions (25-45 minutes) for better focus',
                icon: 'clock'
            });
        }

        if (stats.streak === 0) {
            recommendations.push({
                type: 'consistency',
                message: 'Start a streak! Study a little bit every day',
                icon: 'fire'
            });
        }

        if (stats.totalSessions < 7) {
            recommendations.push({
                type: 'frequency',
                message: 'Aim for at least one study session per day',
                icon: 'calendar-check'
            });
        }

        // Check subject balance
        const distribution = this.getSubjectDistribution();
        const subjects = Object.keys(distribution);

        if (subjects.length > 0 && window.studyApp.data.subjects.length > subjects.length) {
            const neglected = window.studyApp.data.subjects.filter(s =>
                !distribution[s.id]
            );

            if (neglected.length > 0) {
                recommendations.push({
                    type: 'balance',
                    message: `Don't forget about ${neglected[0].name}!`,
                    icon: 'balance-scale'
                });
            }
        }

        return recommendations;
    }
}

// Initialize tracker
document.addEventListener('DOMContentLoaded', () => {
    window.studyTracker = new StudyTracker();
});
