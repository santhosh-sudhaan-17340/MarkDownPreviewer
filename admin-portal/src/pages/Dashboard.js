import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';

function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get('/api/admin/dashboard');
      setData(response.data);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load dashboard');
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!data) return null;

  const { stats, recentReservations, healthOverview, expiringSummary } = data;

  const occupancyRate = stats.total_slots > 0
    ? ((stats.occupied_slots + stats.reserved_slots) / stats.total_slots * 100).toFixed(1)
    : 0;

  return (
    <div>
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>Overview of parcel locker system</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Locations</h3>
          <div className="value">{stats.total_locations}</div>
          <div className="label">Active locker locations</div>
        </div>
        <div className="stat-card">
          <h3>Total Slots</h3>
          <div className="value">{stats.total_slots}</div>
          <div className="label">Available: {stats.available_slots} | Occupied: {stats.occupied_slots}</div>
        </div>
        <div className="stat-card">
          <h3>Occupancy Rate</h3>
          <div className="value">{occupancyRate}%</div>
          <div className="label">{stats.occupied_slots + stats.reserved_slots} slots in use</div>
        </div>
        <div className="stat-card">
          <h3>24h Activity</h3>
          <div className="value">{stats.reservations_24h}</div>
          <div className="label">Pickups: {stats.pickups_24h} | Expired: {stats.expired_24h}</div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card" style={{ background: expiringSummary.expiring_6h > 0 ? '#fff3cd' : 'white' }}>
          <h3>Expiring Soon</h3>
          <div className="value">{expiringSummary.expiring_6h}</div>
          <div className="label">Within 6 hours</div>
        </div>
        <div className="stat-card">
          <h3>Expiring 12h</h3>
          <div className="value">{expiringSummary.expiring_12h}</div>
          <div className="label">Within 12 hours</div>
        </div>
        <div className="stat-card">
          <h3>Expiring 24h</h3>
          <div className="value">{expiringSummary.expiring_24h}</div>
          <div className="label">Within 24 hours</div>
        </div>
        <div className="stat-card">
          <h3>Active Reservations</h3>
          <div className="value">{expiringSummary.total_active}</div>
          <div className="label">Currently active</div>
        </div>
      </div>

      <div className="card">
        <h3>Recent Reservations</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Tracking #</th>
                <th>Recipient</th>
                <th>Locker</th>
                <th>Slot</th>
                <th>Pickup Code</th>
                <th>Status</th>
                <th>Expires</th>
              </tr>
            </thead>
            <tbody>
              {recentReservations.map((reservation) => (
                <tr key={reservation.id}>
                  <td>{reservation.tracking_number}</td>
                  <td>{reservation.recipient_name}</td>
                  <td>{reservation.locker_name}</td>
                  <td>{reservation.slot_number}</td>
                  <td><code>{reservation.pickup_code}</code></td>
                  <td>
                    <span className={`badge ${getStatusBadgeClass(reservation.status)}`}>
                      {reservation.status}
                    </span>
                  </td>
                  <td>{format(new Date(reservation.expires_at), 'MMM dd, HH:mm')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3>Locker Health Overview</h3>
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
                <th>Health %</th>
              </tr>
            </thead>
            <tbody>
              {healthOverview.slice(0, 5).map((location) => (
                <tr key={location.location_id}>
                  <td>{location.location_name}</td>
                  <td>{location.city}</td>
                  <td>{location.total_slots}</td>
                  <td>{location.healthy_slots}</td>
                  <td>{location.warning_slots}</td>
                  <td>{location.critical_slots}</td>
                  <td>
                    <span className={`badge ${getHealthBadgeClass(location.health_percentage)}`}>
                      {location.health_percentage}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function getStatusBadgeClass(status) {
  const map = {
    'active': 'info',
    'completed': 'success',
    'expired': 'danger',
    'cancelled': 'secondary'
  };
  return map[status] || 'secondary';
}

function getHealthBadgeClass(percentage) {
  if (percentage >= 90) return 'success';
  if (percentage >= 70) return 'warning';
  return 'danger';
}

export default Dashboard;
