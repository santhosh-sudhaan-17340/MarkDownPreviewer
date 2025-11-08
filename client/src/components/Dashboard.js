import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, Target } from 'lucide-react';
import './Dashboard.css';

function Dashboard({ user }) {
  const [stats, setStats] = useState(null);
  const [budgets, setBudgets] = useState([]);
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, budgetsRes, savingsRes] = await Promise.all([
        axios.get('/expenses/stats?period=month'),
        axios.get('/budgets'),
        axios.get('/savings')
      ]);

      setStats(statsRes.data);
      setBudgets(budgetsRes.data);
      setSavingsGoals(savingsRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="spinner"></div>;
  }

  const COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A8E6CF', '#FF8B94', '#C7CEEA', '#B4A7D6', '#FFD93D', '#95E1D3'];

  return (
    <div className="dashboard">
      <h1 className="page-title">Dashboard</h1>

      <div className="grid-3">
        <div className="stat-card">
          <div className="stat-icon">
            <DollarSign size={32} />
          </div>
          <div className="stat-value">${stats?.total?.toFixed(2) || '0.00'}</div>
          <div className="stat-label">Total Spending This Month</div>
        </div>

        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)' }}>
          <div className="stat-icon">
            <Target size={32} />
          </div>
          <div className="stat-value">{budgets.length}</div>
          <div className="stat-label">Active Budgets</div>
        </div>

        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #FFE66D 0%, #FFAF40 100%)', color: '#333' }}>
          <div className="stat-icon">
            <TrendingUp size={32} />
          </div>
          <div className="stat-value">{savingsGoals.filter(g => !g.is_completed).length}</div>
          <div className="stat-label">Active Savings Goals</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Spending by Category</h2>
          </div>
          {stats?.byCategory?.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.byCategory}
                  dataKey="total"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry) => `${entry.name}: $${entry.total.toFixed(2)}`}
                >
                  {stats.byCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="no-data">No expense data available</p>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Daily Trend</h2>
          </div>
          {stats?.dailyTrend?.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.dailyTrend}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="#667eea" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="no-data">No trend data available</p>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Budget Overview</h2>
        </div>
        {budgets.length > 0 ? (
          <div className="budget-list">
            {budgets.slice(0, 5).map(budget => (
              <div key={budget.id} className="budget-item">
                <div className="budget-info">
                  <span className="budget-name">
                    {budget.category_icon} {budget.category_name || 'Overall Budget'}
                  </span>
                  <span className="budget-amount">
                    ${budget.spent.toFixed(2)} / ${budget.amount.toFixed(2)}
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${Math.min(budget.percentage, 100)}%`,
                      background: budget.percentage >= budget.alert_threshold
                        ? 'linear-gradient(90deg, #f56565, #e53e3e)'
                        : 'linear-gradient(90deg, #667eea, #764ba2)'
                    }}
                  ></div>
                </div>
                <span className="budget-percentage">{budget.percentage.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="no-data">No budgets set. Create one to track your spending!</p>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
