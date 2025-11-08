import React, { useState, useEffect } from 'react';
import axios from 'axios';

function HealthMonitoring() {
  const [overview, setOverview] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHealthData();
  }, []);

  const fetchHealthData = async () => {
    try {
      const [overviewRes, maintenanceRes] = await Promise.all([
        axios.get('/api/admin/health/overview'),
        axios.get('/api/admin/health/maintenance')
      ]);
      setOverview(overviewRes.data);
      setMaintenance(maintenanceRes.data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load health data:', err);
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading health monitoring data...</div>;

  return (
    <div>
      <div className="page-header">
        <h2>Health Monitoring</h2>
        <p>Monitor locker health and maintenance status</p>
      </div>

      <div className="card">
        <h3>Location Health Overview</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Location</th>
                <th>City</th>
                <th>Total Slots</th>
                <th>Healthy</th>
                <th>Warning</th>
                <th>Critical</th>
                <th>Broken</th>
                <th>Maintenance</th>
                <th>Health %</th>
              </tr>
            </thead>
            <tbody>
              {overview.map((loc) => (
                <tr key={loc.location_id}>
                  <td><strong>{loc.location_name}</strong></td>
                  <td>{loc.city}</td>
                  <td>{loc.total_slots}</td>
                  <td>{loc.healthy_slots}</td>
                  <td>{loc.warning_slots}</td>
                  <td>{loc.critical_slots}</td>
                  <td>{loc.broken_slots}</td>
                  <td>{loc.maintenance_slots}</td>
                  <td>
                    <span className={`badge ${getHealthBadge(loc.health_percentage)}`}>
                      {loc.health_percentage}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3>Maintenance Queue ({maintenance.length})</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Location</th>
                <th>Slot #</th>
                <th>Size</th>
                <th>Status</th>
                <th>Health</th>
                <th>Temperature</th>
                <th>Latest Error</th>
                <th>Issues (7d)</th>
              </tr>
            </thead>
            <tbody>
              {maintenance.length === 0 ? (
                <tr>
                  <td colSpan="8" className="empty-state">
                    <div>
                      <h3>✓ All systems operational</h3>
                      <p>No slots requiring maintenance</p>
                    </div>
                  </td>
                </tr>
              ) : (
                maintenance.map((slot) => (
                  <tr key={slot.slot_id}>
                    <td>{slot.location_name}, {slot.city}</td>
                    <td><strong>{slot.slot_number}</strong></td>
                    <td><span className="badge info">{slot.size}</span></td>
                    <td>
                      <span className={`badge ${getStatusBadge(slot.status)}`}>
                        {slot.status}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${getHealthStatusBadge(slot.health_status)}`}>
                        {slot.health_status}
                      </span>
                    </td>
                    <td>{slot.temperature ? `${slot.temperature}°C` : 'N/A'}</td>
                    <td>{slot.latest_error || '-'}</td>
                    <td>{slot.issue_count_7d}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function getHealthBadge(percentage) {
  if (!percentage) return 'secondary';
  if (percentage >= 90) return 'success';
  if (percentage >= 70) return 'warning';
  return 'danger';
}

function getHealthStatusBadge(status) {
  const map = {
    'good': 'success',
    'warning': 'warning',
    'critical': 'danger',
    'unknown': 'secondary'
  };
  return map[status] || 'secondary';
}

function getStatusBadge(status) {
  const map = {
    'available': 'success',
    'occupied': 'info',
    'reserved': 'info',
    'maintenance': 'warning',
    'broken': 'danger'
  };
  return map[status] || 'secondary';
}

export default HealthMonitoring;
