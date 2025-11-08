import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AttendancePanel.css';

const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

function AttendancePanel({ classId, participants }) {
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAttendance();
    const interval = setInterval(fetchAttendance, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, [classId]);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${SERVER_URL}/api/attendance/${classId}`);
      setAttendanceData(response.data.records || []);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (minutes) => {
    if (!minutes) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatTime = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isCurrentlyPresent = (userId) => {
    return participants.some(p => p.userId === userId);
  };

  return (
    <div className="attendance-panel">
      <div className="attendance-header">
        <h3>Attendance</h3>
        <button onClick={fetchAttendance} className="btn-refresh" disabled={loading}>
          {loading ? '⟳' : '🔄'} Refresh
        </button>
      </div>

      <div className="attendance-stats">
        <div className="stat-card">
          <div className="stat-value">{participants.length}</div>
          <div className="stat-label">Currently Present</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{attendanceData.length}</div>
          <div className="stat-label">Total Joined</div>
        </div>
      </div>

      <div className="attendance-list">
        {attendanceData.length === 0 ? (
          <div className="empty-state">
            <p>No attendance records yet</p>
          </div>
        ) : (
          <table className="attendance-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              {attendanceData.map((record, index) => (
                <tr key={index}>
                  <td>{record.userName}</td>
                  <td>
                    <span className={`status-badge ${isCurrentlyPresent(record.userId) ? 'present' : 'left'}`}>
                      {isCurrentlyPresent(record.userId) ? '🟢 Present' : '🔴 Left'}
                    </span>
                  </td>
                  <td>{formatTime(record.joinedAt)}</td>
                  <td>{formatDuration(record.duration)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default AttendancePanel;
