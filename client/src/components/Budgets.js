import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import './Budgets.css';

function Budgets({ user }) {
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    categoryId: '',
    amount: '',
    currency: user?.defaultCurrency || 'USD',
    period: 'monthly',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    alertThreshold: 80
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBudgets();
    fetchCategories();
  }, []);

  const fetchBudgets = async () => {
    try {
      const response = await axios.get('/budgets');
      setBudgets(response.data);
    } catch (error) {
      console.error('Error fetching budgets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
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
      await axios.post('/budgets', formData);
      fetchBudgets();
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error creating budget:', error);
      alert('Failed to create budget');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this budget?')) {
      try {
        await axios.delete(`/budgets/${id}`);
        fetchBudgets();
      } catch (error) {
        console.error('Error deleting budget:', error);
        alert('Failed to delete budget');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      categoryId: '',
      amount: '',
      currency: user?.defaultCurrency || 'USD',
      period: 'monthly',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      alertThreshold: 80
    });
  };

  const getBudgetStatus = (budget) => {
    if (budget.percentage >= 100) return 'exceeded';
    if (budget.percentage >= budget.alert_threshold) return 'warning';
    return 'good';
  };

  if (loading) {
    return <div className="spinner"></div>;
  }

  return (
    <div className="budgets">
      <div className="page-header">
        <h1 className="page-title">Budgets</h1>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <Plus size={20} />
          Create Budget
        </button>
      </div>

      <div className="budgets-grid">
        {budgets.length > 0 ? (
          budgets.map(budget => {
            const status = getBudgetStatus(budget);

            return (
              <div key={budget.id} className={`budget-card budget-${status}`}>
                <div className="budget-card-header">
                  <div className="budget-category">
                    <span className="category-icon">{budget.category_icon || '💰'}</span>
                    <span className="category-name">{budget.category_name || 'Overall Budget'}</span>
                  </div>
                  <button onClick={() => handleDelete(budget.id)} className="delete-btn-small">
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="budget-amounts">
                  <div className="amount-spent">
                    <span className="amount-label">Spent</span>
                    <span className="amount-value">${budget.spent.toFixed(2)}</span>
                  </div>
                  <div className="amount-total">
                    <span className="amount-label">Budget</span>
                    <span className="amount-value">${budget.amount.toFixed(2)}</span>
                  </div>
                </div>

                <div className="budget-progress">
                  <div className="progress-bar">
                    <div
                      className={`progress-fill progress-${status}`}
                      style={{ width: `${Math.min(budget.percentage, 100)}%` }}
                    ></div>
                  </div>
                  <span className="progress-text">{budget.percentage.toFixed(1)}%</span>
                </div>

                <div className="budget-status">
                  {status === 'exceeded' && (
                    <>
                      <AlertCircle size={16} />
                      <span>Budget exceeded by ${(budget.spent - budget.amount).toFixed(2)}</span>
                    </>
                  )}
                  {status === 'warning' && (
                    <>
                      <AlertCircle size={16} />
                      <span>Approaching budget limit</span>
                    </>
                  )}
                  {status === 'good' && (
                    <>
                      <CheckCircle size={16} />
                      <span>${budget.remaining.toFixed(2)} remaining</span>
                    </>
                  )}
                </div>

                <div className="budget-period">
                  {budget.period.charAt(0).toUpperCase() + budget.period.slice(1)} budget
                </div>
              </div>
            );
          })
        ) : (
          <div className="no-budgets">
            <p>No budgets created yet.</p>
            <p>Create your first budget to track your spending!</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Create Budget</h2>
              <button onClick={() => setShowModal(false)} className="close-btn">&times;</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label className="input-label">Category</label>
                <select
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleChange}
                  className="select-field"
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid-2">
                <div className="input-group">
                  <label className="input-label">Amount *</label>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    className="input-field"
                    step="0.01"
                    required
                  />
                </div>

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
              </div>

              <div className="input-group">
                <label className="input-label">Period *</label>
                <select
                  name="period"
                  value={formData.period}
                  onChange={handleChange}
                  className="select-field"
                  required
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div className="grid-2">
                <div className="input-group">
                  <label className="input-label">Start Date *</label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    className="input-field"
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">End Date (Optional)</label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Alert Threshold (%)</label>
                <input
                  type="number"
                  name="alertThreshold"
                  value={formData.alertThreshold}
                  onChange={handleChange}
                  className="input-field"
                  min="1"
                  max="100"
                />
                <small style={{ color: '#718096', marginTop: '4px', display: 'block' }}>
                  Get notified when you reach {formData.alertThreshold}% of your budget
                </small>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Budgets;
