import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, DollarSign, Target, TrendingUp, Trophy, LogOut } from 'lucide-react';
import './Navigation.css';

function Navigation({ user, onLogout }) {
  const location = useLocation();

  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/expenses', icon: DollarSign, label: 'Expenses' },
    { path: '/budgets', icon: Target, label: 'Budgets' },
    { path: '/savings', icon: TrendingUp, label: 'Savings' },
    { path: '/achievements', icon: Trophy, label: 'Achievements' }
  ];

  return (
    <nav className="navigation">
      <div className="nav-brand">
        <DollarSign size={32} />
        <span className="nav-title">Smart Expense Manager</span>
      </div>

      <div className="nav-links">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="nav-user">
        <span className="user-name">{user?.username || 'User'}</span>
        <button onClick={onLogout} className="logout-btn">
          <LogOut size={20} />
        </button>
      </div>
    </nav>
  );
}

export default Navigation;
