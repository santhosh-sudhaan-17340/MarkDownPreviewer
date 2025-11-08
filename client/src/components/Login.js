import React, { useState } from 'react';
import axios from 'axios';
import { DollarSign, Mail, Lock, User } from 'lucide-react';
import './Login.css';

function Login({ onLogin }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    defaultCurrency: 'USD'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isRegistering ? '/auth/register' : '/auth/login';
      const response = await axios.post(endpoint, formData);

      onLogin(response.data.user, response.data.token);
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <DollarSign size={48} className="login-icon" />
          <h1 className="login-title">Smart Expense Manager</h1>
          <p className="login-subtitle">
            Track expenses, manage budgets, and achieve your financial goals
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {isRegistering && (
            <div className="input-group">
              <label className="input-label">
                <User size={18} />
                Username
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="input-field"
                required
              />
            </div>
          )}

          <div className="input-group">
            <label className="input-label">
              <Mail size={18} />
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="input-field"
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">
              <Lock size={18} />
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="input-field"
              required
            />
          </div>

          {isRegistering && (
            <div className="input-group">
              <label className="input-label">Default Currency</label>
              <select
                name="defaultCurrency"
                value={formData.defaultCurrency}
                onChange={handleChange}
                className="select-field"
              >
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="INR">INR - Indian Rupee</option>
                <option value="JPY">JPY - Japanese Yen</option>
              </select>
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
            {loading ? 'Please wait...' : (isRegistering ? 'Register' : 'Login')}
          </button>

          <div className="toggle-mode">
            {isRegistering ? 'Already have an account? ' : "Don't have an account? "}
            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError('');
              }}
              className="toggle-btn"
            >
              {isRegistering ? 'Login' : 'Register'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;
