import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, TrendingUp } from 'lucide-react';
import './Savings.css';

function Savings({ user }) {
  const [goals, setGoals] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    targetAmount: '',
    currentAmount: 0,
    currency: user?.defaultCurrency || 'USD',
    deadline: '',
    icon: '💰',
    color: '#667eea'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      const response = await axios.get('/savings');
      setGoals(response.data);
    } catch (error) {
      console.error('Error fetching savings goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingGoal) {
        await axios.put(`/savings/${editingGoal.id}`, formData);
      } else {
        await axios.post('/savings', formData);
      }
      fetchGoals();
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving goal:', error);
      alert('Failed to save goal');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this savings goal?')) {
      try {
        await axios.delete(`/savings/${id}`);
        fetchGoals();
      } catch (error) {
        console.error('Error deleting goal:', error);
        alert('Failed to delete goal');
      }
    }
  };

  const handleUpdateProgress = async (goal) => {
    const newAmount = prompt(`Update progress for "${goal.name}".\nCurrent: $${goal.current_amount}\nTarget: $${goal.target_amount}\n\nEnter new amount:`);

    if (newAmount !== null) {
      try {
        await axios.put(`/savings/${goal.id}`, { currentAmount: parseFloat(newAmount) });
        fetchGoals();
      } catch (error) {
        console.error('Error updating progress:', error);
        alert('Failed to update progress');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      targetAmount: '',
      currentAmount: 0,
      currency: user?.defaultCurrency || 'USD',
      deadline: '',
      icon: '💰',
      color: '#667eea'
    });
    setEditingGoal(null);
  };

  const icons = ['💰', '🏠', '🚗', '✈️', '🎓', '💍', '🎮', '📱', '💻', '🎸'];
  const colors = ['#667eea', '#4ECDC4', '#FF6B6B', '#FFE66D', '#A8E6CF', '#FF8B94', '#C7CEEA', '#B4A7D6', '#FFD93D'];

  if (loading) {
    return <div className="spinner"></div>;
  }

  return (
    <div className="savings">
      <div className="page-header">
        <h1 className="page-title">Savings Goals</h1>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <Plus size={20} />
          New Goal
        </button>
      </div>

      <div className="savings-grid">
        {goals.length > 0 ? (
          goals.map(goal => (
            <div
              key={goal.id}
              className={`savings-card ${goal.is_completed ? 'completed' : ''}`}
              style={{ borderTop: `4px solid ${goal.color || '#667eea'}` }}
            >
              <div className="savings-card-header">
                <div className="goal-icon" style={{ background: goal.color || '#667eea' }}>
                  {goal.icon || '💰'}
                </div>
                <button onClick={() => handleDelete(goal.id)} className="delete-btn-small">
                  <Trash2 size={16} />
                </button>
              </div>

              <h3 className="goal-name">{goal.name}</h3>

              <div className="goal-amounts">
                <div className="current-amount">
                  <span className="amount-label">Saved</span>
                  <span className="amount-value">${goal.current_amount.toFixed(2)}</span>
                </div>
                <div className="target-amount">
                  <span className="amount-label">Goal</span>
                  <span className="amount-value">${goal.target_amount.toFixed(2)}</span>
                </div>
              </div>

              <div className="goal-progress">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${Math.min(goal.progress, 100)}%`,
                      background: goal.color || '#667eea'
                    }}
                  ></div>
                </div>
                <span className="progress-text">{goal.progress.toFixed(1)}%</span>
              </div>

              {goal.deadline && (
                <div className="goal-deadline">
                  <span>Deadline: {new Date(goal.deadline).toLocaleDateString()}</span>
                </div>
              )}

              {goal.is_completed ? (
                <div className="completion-badge">
                  ✨ Goal Achieved!
                </div>
              ) : (
                <button
                  onClick={() => handleUpdateProgress(goal)}
                  className="update-progress-btn"
                >
                  <TrendingUp size={16} />
                  Update Progress
                </button>
              )}
            </div>
          ))
        ) : (
          <div className="no-goals">
            <p>No savings goals yet.</p>
            <p>Create your first goal to start saving!</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingGoal ? 'Edit' : 'Create'} Savings Goal</h2>
              <button onClick={() => setShowModal(false)} className="close-btn">&times;</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label className="input-label">Goal Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="e.g., Emergency Fund, Vacation, New Laptop"
                  required
                />
              </div>

              <div className="grid-2">
                <div className="input-group">
                  <label className="input-label">Target Amount *</label>
                  <input
                    type="number"
                    name="targetAmount"
                    value={formData.targetAmount}
                    onChange={handleChange}
                    className="input-field"
                    step="0.01"
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Current Amount</label>
                  <input
                    type="number"
                    name="currentAmount"
                    value={formData.currentAmount}
                    onChange={handleChange}
                    className="input-field"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="input-group">
                  <label className="input-label">Currency</label>
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleChange}
                    className="select-field"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="INR">INR</option>
                  </select>
                </div>

                <div className="input-group">
                  <label className="input-label">Deadline (Optional)</label>
                  <input
                    type="date"
                    name="deadline"
                    value={formData.deadline}
                    onChange={handleChange}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Icon</label>
                <div className="icon-picker">
                  {icons.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      className={`icon-option ${formData.icon === icon ? 'selected' : ''}`}
                      onClick={() => setFormData({ ...formData, icon })}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Color</label>
                <div className="color-picker">
                  {colors.map(color => (
                    <button
                      key={color}
                      type="button"
                      className={`color-option ${formData.color === color ? 'selected' : ''}`}
                      style={{ background: color }}
                      onClick={() => setFormData({ ...formData, color })}
                    ></button>
                  ))}
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingGoal ? 'Update' : 'Create'} Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Savings;
