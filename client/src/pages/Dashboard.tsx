import { useStore } from '../store';
import { format } from 'date-fns';
import { Flame, Activity, TrendingUp, Target } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './Dashboard.css';

const Dashboard = () => {
  const { user, dailyStats, workouts, progress } = useStore();

  const today = format(new Date(), 'yyyy-MM-dd');
  const todayStats = dailyStats.find(s => s.date === today) || {
    caloriesConsumed: 0,
    caloriesBurned: 0,
    proteinConsumed: 0,
    workoutsCompleted: 0,
    steps: 0,
  };

  const recentWorkouts = workouts
    .filter(w => w.completed)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const weightData = progress
    .slice(-30)
    .map(p => ({
      date: format(new Date(p.date), 'MM/dd'),
      weight: p.weight
    }));

  const calorieData = dailyStats.slice(0, 7).reverse().map(s => ({
    date: format(new Date(s.date), 'MM/dd'),
    consumed: s.caloriesConsumed,
    burned: s.caloriesBurned
  }));

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1>Welcome back, {user?.name || 'User'}!</h1>
        <p>Here's your fitness overview for today</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#fef3c7' }}>
            <Flame size={24} color="#f59e0b" />
          </div>
          <div className="stat-content">
            <h3>Calories</h3>
            <p className="stat-value">{todayStats.caloriesConsumed} / {todayStats.caloriesBurned}</p>
            <span className="stat-label">Consumed / Burned</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#dbeafe' }}>
            <Activity size={24} color="#3b82f6" />
          </div>
          <div className="stat-content">
            <h3>Workouts</h3>
            <p className="stat-value">{todayStats.workoutsCompleted}</p>
            <span className="stat-label">Completed today</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#dcfce7' }}>
            <TrendingUp size={24} color="#10b981" />
          </div>
          <div className="stat-content">
            <h3>Steps</h3>
            <p className="stat-value">{todayStats.steps.toLocaleString()}</p>
            <span className="stat-label">of 10,000 goal</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#f3e8ff' }}>
            <Target size={24} color="#a855f7" />
          </div>
          <div className="stat-content">
            <h3>Protein</h3>
            <p className="stat-value">{Math.round(todayStats.proteinConsumed)}g</p>
            <span className="stat-label">Consumed today</span>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h2>Weight Progress</h2>
          {weightData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={weightData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="weight" stroke="#6366f1" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="no-data">No weight data available</p>
          )}
        </div>

        <div className="chart-card">
          <h2>Calories (Last 7 Days)</h2>
          {calorieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={calorieData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="consumed" stackId="1" stroke="#f59e0b" fill="#fef3c7" />
                <Area type="monotone" dataKey="burned" stackId="2" stroke="#10b981" fill="#dcfce7" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="no-data">No calorie data available</p>
          )}
        </div>
      </div>

      <div className="recent-activity">
        <h2>Recent Workouts</h2>
        {recentWorkouts.length > 0 ? (
          <div className="workout-list">
            {recentWorkouts.map(workout => (
              <div key={workout.id} className="workout-item">
                <div className="workout-info">
                  <h3>{workout.type.charAt(0).toUpperCase() + workout.type.slice(1)} Workout</h3>
                  <p>{format(new Date(workout.date), 'MMM dd, yyyy')}</p>
                </div>
                <div className="workout-stats">
                  <span>{workout.duration} min</span>
                  <span>{workout.caloriesBurned} cal</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="no-data">No recent workouts</p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
