import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Reports() {
  const [activeTab, setActiveTab] = useState('overfill');
  const [overfillData, setOverfillData] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);
  const [occupancyData, setOccupancyData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const [overfill, occupancy] = await Promise.all([
        axios.get('/api/admin/reports/overfill'),
        axios.get('/api/admin/reports/occupancy')
      ]);
      setOverfillData(overfill.data);
      setOccupancyData(occupancy.data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load reports:', err);
      setLoading(false);
    }
  };

  const fetchPerformanceReport = async () => {
    try {
      const endDate = new Date().toISOString();
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const response = await axios.get('/api/admin/reports/performance', {
        params: { startDate, endDate }
      });
      setPerformanceData(response.data);
    } catch (err) {
      console.error('Failed to load performance report:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'performance') {
      fetchPerformanceReport();
    }
  }, [activeTab]);

  if (loading) return <div className="loading">Loading reports...</div>;

  return (
    <div>
      <div className="page-header">
        <h2>Reports & Analytics</h2>
        <p>System performance and optimization insights</p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button
          className={`btn ${activeTab === 'overfill' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('overfill')}
          style={{ marginRight: '10px' }}
        >
          Overfill Report
        </button>
        <button
          className={`btn ${activeTab === 'occupancy' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('occupancy')}
          style={{ marginRight: '10px' }}
        >
          Occupancy Report
        </button>
        <button
          className={`btn ${activeTab === 'performance' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('performance')}
        >
          Performance Metrics
        </button>
      </div>

      {activeTab === 'overfill' && (
        <div className="card">
          <h3>Overfill Report - Locations at Risk</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Location</th>
                  <th>City</th>
                  <th>Total Slots</th>
                  <th>Used</th>
                  <th>Available</th>
                  <th>Occupancy</th>
                  <th>Risk Level</th>
                  <th>Pending</th>
                  <th>Capacity Status</th>
                </tr>
              </thead>
              <tbody>
                {overfillData.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="empty-state">
                      <div>
                        <h3>✓ No overfill issues</h3>
                        <p>All locations have adequate capacity</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  overfillData.map((loc) => (
                    <tr key={loc.id}>
                      <td><strong>{loc.name}</strong></td>
                      <td>{loc.city}</td>
                      <td>{loc.total_slots}</td>
                      <td>{loc.used_slots}</td>
                      <td>{loc.available_slots}</td>
                      <td>
                        <span className={`badge ${getOccupancyBadge(loc.occupancy_percentage)}`}>
                          {loc.occupancy_percentage}%
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${getRiskBadge(loc.risk_level)}`}>
                          {loc.risk_level}
                        </span>
                      </td>
                      <td>{loc.pending_deliveries}</td>
                      <td>
                        <span className={`badge ${getCapacityBadge(loc.capacity_status)}`}>
                          {loc.capacity_status.replace(/_/g, ' ')}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'occupancy' && (
        <div className="card">
          <h3>Occupancy Report</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Location</th>
                  <th>City</th>
                  <th>Total Slots</th>
                  <th>Available</th>
                  <th>Occupied</th>
                  <th>Reserved</th>
                  <th>Maintenance</th>
                  <th>Occupancy</th>
                  <th>Size Distribution</th>
                </tr>
              </thead>
              <tbody>
                {occupancyData.map((loc) => (
                  <tr key={loc.id}>
                    <td><strong>{loc.locker_name}</strong></td>
                    <td>{loc.city}</td>
                    <td>{loc.total_slots}</td>
                    <td>{loc.available_slots}</td>
                    <td>{loc.occupied_slots}</td>
                    <td>{loc.reserved_slots}</td>
                    <td>{loc.maintenance_slots}</td>
                    <td>
                      <span className={`badge ${getOccupancyBadge(loc.current_occupancy_percentage)}`}>
                        {loc.current_occupancy_percentage}%
                      </span>
                    </td>
                    <td>
                      S:{loc.small_slots} M:{loc.medium_slots} L:{loc.large_slots} XL:{loc.extra_large_slots}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'performance' && (
        <div className="card">
          <h3>Performance Metrics (Last 30 Days)</h3>
          {performanceData.length === 0 ? (
            <div className="loading">Loading performance data...</div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Location</th>
                    <th>Reservations</th>
                    <th>Completed</th>
                    <th>Expired</th>
                    <th>Success Rate</th>
                    <th>Avg Pickup Time</th>
                    <th>Peak Occupancy</th>
                  </tr>
                </thead>
                <tbody>
                  {performanceData.map((loc) => (
                    <tr key={loc.location_id}>
                      <td><strong>{loc.location_name}</strong></td>
                      <td>{loc.total_reservations}</td>
                      <td>{loc.completed_pickups}</td>
                      <td>{loc.expired_parcels}</td>
                      <td>
                        <span className={`badge ${getSuccessRateBadge(loc.pickup_success_rate)}`}>
                          {loc.pickup_success_rate}%
                        </span>
                      </td>
                      <td>{loc.avg_pickup_time_hours ? `${loc.avg_pickup_time_hours}h` : 'N/A'}</td>
                      <td>{loc.peak_occupancy_percentage ? `${loc.peak_occupancy_percentage}%` : 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getOccupancyBadge(percentage) {
  if (!percentage) return 'secondary';
  if (percentage >= 90) return 'danger';
  if (percentage >= 70) return 'warning';
  return 'success';
}

function getRiskBadge(level) {
  const map = {
    'CRITICAL': 'danger',
    'HIGH': 'warning',
    'MEDIUM': 'info',
    'LOW': 'success'
  };
  return map[level] || 'secondary';
}

function getCapacityBadge(status) {
  const map = {
    'INSUFFICIENT_CAPACITY': 'danger',
    'TIGHT_CAPACITY': 'warning',
    'ADEQUATE_CAPACITY': 'success'
  };
  return map[status] || 'secondary';
}

function getSuccessRateBadge(rate) {
  if (rate >= 90) return 'success';
  if (rate >= 70) return 'warning';
  return 'danger';
}

export default Reports;
