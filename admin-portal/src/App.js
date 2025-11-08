import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import axios from 'axios';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Lockers from './pages/Lockers';
import Reservations from './pages/Reservations';
import HealthMonitoring from './pages/HealthMonitoring';
import Reports from './pages/Reports';

function App() {
  const [token, setToken] = useState(localStorage.getItem('adminToken'));
  const [admin, setAdmin] = useState(null);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const storedAdmin = localStorage.getItem('admin');
      if (storedAdmin) {
        setAdmin(JSON.parse(storedAdmin));
      }
    }
  }, [token]);

  const handleLogin = (token, adminData) => {
    localStorage.setItem('adminToken', token);
    localStorage.setItem('admin', JSON.stringify(adminData));
    setToken(token);
    setAdmin(adminData);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('admin');
    setToken(null);
    setAdmin(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <div className="app">
        <Sidebar admin={admin} onLogout={handleLogout} />
        <div className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/lockers" element={<Lockers />} />
            <Route path="/reservations" element={<Reservations />} />
            <Route path="/health" element={<HealthMonitoring />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

function Sidebar({ admin, onLogout }) {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1>🔒 Parcel Locker</h1>
        <p>Admin Portal</p>
        {admin && <p style={{ marginTop: '10px', fontSize: '11px' }}>Logged in as: {admin.username}</p>}
      </div>
      <nav>
        <ul className="sidebar-nav">
          <li><Link to="/">📊 Dashboard</Link></li>
          <li><Link to="/lockers">🗄️ Lockers</Link></li>
          <li><Link to="/reservations">📦 Reservations</Link></li>
          <li><Link to="/health">🏥 Health Monitoring</Link></li>
          <li><Link to="/reports">📈 Reports</Link></li>
          <li style={{ marginTop: '30px' }}>
            <button
              onClick={onLogout}
              style={{
                width: '100%',
                padding: '10px',
                background: '#e74c3c',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Logout
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}

export default App;
