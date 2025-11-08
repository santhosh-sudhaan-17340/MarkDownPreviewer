import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Lockers() {
  const [lockers, setLockers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLockers();
  }, []);

  const fetchLockers = async () => {
    try {
      const response = await axios.get('/api/admin/lockers');
      setLockers(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load lockers:', err);
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading lockers...</div>;

  return (
    <div>
      <div className="page-header">
        <h2>Locker Locations</h2>
        <p>Manage locker locations and capacity</p>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Location</th>
                <th>City</th>
                <th>Status</th>
                <th>Total Slots</th>
                <th>Available</th>
                <th>Occupied</th>
                <th>Reserved</th>
                <th>Occupancy</th>
              </tr>
            </thead>
            <tbody>
              {lockers.map((locker) => (
                <tr key={locker.locker_location_id}>
                  <td><strong>{locker.locker_name}</strong></td>
                  <td>{locker.city}</td>
                  <td>
                    <span className={`badge ${locker.locker_status === 'active' ? 'success' : 'warning'}`}>
                      {locker.locker_status}
                    </span>
                  </td>
                  <td>{locker.total_slots}</td>
                  <td>{locker.available_slots}</td>
                  <td>{locker.occupied_slots}</td>
                  <td>{locker.reserved_slots}</td>
                  <td>
                    <span className={`badge ${getOccupancyBadge(locker.occupancy_percentage)}`}>
                      {locker.occupancy_percentage}%
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

function getOccupancyBadge(percentage) {
  if (!percentage) return 'secondary';
  if (percentage >= 90) return 'danger';
  if (percentage >= 70) return 'warning';
  return 'success';
}

export default Lockers;
