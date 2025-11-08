import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';

function Reservations() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchReservations();
  }, [statusFilter]);

  const fetchReservations = async () => {
    try {
      const params = statusFilter ? { status: statusFilter } : {};
      const response = await axios.get('/api/admin/reservations', { params });
      setReservations(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load reservations:', err);
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading reservations...</div>;

  return (
    <div>
      <div className="page-header">
        <h2>Reservations</h2>
        <p>View and manage parcel reservations</p>
      </div>

      <div className="card">
        <div style={{ marginBottom: '20px' }}>
          <label style={{ marginRight: '10px' }}>Filter by status:</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Tracking #</th>
                <th>Recipient</th>
                <th>Email</th>
                <th>Size</th>
                <th>Locker</th>
                <th>Slot</th>
                <th>Pickup Code</th>
                <th>Status</th>
                <th>Created</th>
                <th>Expires</th>
              </tr>
            </thead>
            <tbody>
              {reservations.length === 0 ? (
                <tr>
                  <td colSpan="10" className="empty-state">No reservations found</td>
                </tr>
              ) : (
                reservations.map((res) => (
                  <tr key={res.id}>
                    <td><strong>{res.tracking_number}</strong></td>
                    <td>{res.recipient_name}</td>
                    <td>{res.recipient_email}</td>
                    <td><span className="badge info">{res.size}</span></td>
                    <td>{res.locker_name}, {res.city}</td>
                    <td>{res.slot_number}</td>
                    <td><code>{res.pickup_code}</code></td>
                    <td>
                      <span className={`badge ${getStatusBadge(res.status)}`}>
                        {res.status}
                      </span>
                    </td>
                    <td>{format(new Date(res.created_at), 'MMM dd, HH:mm')}</td>
                    <td>{format(new Date(res.expires_at), 'MMM dd, HH:mm')}</td>
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

function getStatusBadge(status) {
  const map = {
    'active': 'info',
    'completed': 'success',
    'expired': 'danger',
    'cancelled': 'secondary'
  };
  return map[status] || 'secondary';
}

export default Reservations;
