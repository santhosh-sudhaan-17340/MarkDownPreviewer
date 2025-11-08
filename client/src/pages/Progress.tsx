import { useState } from 'react';
import { useStore } from '../store';
import { format } from 'date-fns';
import { TrendingUp, TrendingDown, Plus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import './Progress.css';

const Progress = () => {
  const { user, progress, addProgress } = useStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    weight: user?.weight || 0,
    bodyFat: 0,
    muscleMass: 0,
    chest: 0,
    waist: 0,
    hips: 0,
    arms: 0,
    thighs: 0
  });

  const sortedProgress = [...progress].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const weightData = sortedProgress.map(p => ({
    date: format(new Date(p.date), 'MM/dd'),
    weight: p.weight,
    bodyFat: p.bodyFat || 0
  }));

  const latestProgress = sortedProgress[sortedProgress.length - 1];
  const previousProgress = sortedProgress[sortedProgress.length - 2];

  const weightChange = latestProgress && previousProgress
    ? latestProgress.weight - previousProgress.weight
    : 0;

  const bodyFatChange = latestProgress?.bodyFat && previousProgress?.bodyFat
    ? latestProgress.bodyFat - previousProgress.bodyFat
    : 0;

  const measurementsData = latestProgress?.measurements ? [
    { name: 'Chest', value: latestProgress.measurements.chest || 0 },
    { name: 'Waist', value: latestProgress.measurements.waist || 0 },
    { name: 'Hips', value: latestProgress.measurements.hips || 0 },
    { name: 'Arms', value: latestProgress.measurements.arms || 0 },
    { name: 'Thighs', value: latestProgress.measurements.thighs || 0 }
  ].filter(m => m.value > 0) : [];

  const handleAddProgress = () => {
    const newProgress = {
      id: Date.now().toString(),
      userId: user?.id || 'demo',
      date: new Date().toISOString().split('T')[0],
      weight: formData.weight,
      bodyFat: formData.bodyFat || undefined,
      muscleMass: formData.muscleMass || undefined,
      measurements: {
        chest: formData.chest || undefined,
        waist: formData.waist || undefined,
        hips: formData.hips || undefined,
        arms: formData.arms || undefined,
        thighs: formData.thighs || undefined
      }
    };

    addProgress(newProgress);
    setShowAddModal(false);
  };

  return (
    <div className="progress-page">
      <div className="page-header">
        <h1>Progress Tracking</h1>
        <p>Monitor your fitness journey with detailed analytics</p>
      </div>

      <button onClick={() => setShowAddModal(true)} className="add-progress-btn">
        <Plus size={20} />
        Log Progress
      </button>

      <div className="progress-stats">
        <div className="progress-stat-card">
          <h3>Current Weight</h3>
          <p className="stat-value">{latestProgress?.weight || user?.weight || 0} kg</p>
          {weightChange !== 0 && (
            <span className={`stat-change ${weightChange < 0 ? 'positive' : 'negative'}`}>
              {weightChange > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              {Math.abs(weightChange).toFixed(1)} kg
            </span>
          )}
        </div>

        <div className="progress-stat-card">
          <h3>Body Fat</h3>
          <p className="stat-value">{latestProgress?.bodyFat?.toFixed(1) || 0}%</p>
          {bodyFatChange !== 0 && (
            <span className={`stat-change ${bodyFatChange < 0 ? 'positive' : 'negative'}`}>
              {bodyFatChange > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              {Math.abs(bodyFatChange).toFixed(1)}%
            </span>
          )}
        </div>

        <div className="progress-stat-card">
          <h3>Muscle Mass</h3>
          <p className="stat-value">{latestProgress?.muscleMass?.toFixed(1) || 0} kg</p>
        </div>

        <div className="progress-stat-card">
          <h3>Total Entries</h3>
          <p className="stat-value">{progress.length}</p>
        </div>
      </div>

      <div className="charts-container">
        <div className="chart-section">
          <h2>Weight & Body Fat Trend</h2>
          {weightData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weightData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Line yAxisId="left" type="monotone" dataKey="weight" stroke="#6366f1" strokeWidth={2} name="Weight (kg)" />
                <Line yAxisId="right" type="monotone" dataKey="bodyFat" stroke="#f59e0b" strokeWidth={2} name="Body Fat (%)" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="no-data">No weight data available</p>
          )}
        </div>

        <div className="chart-section">
          <h2>Current Measurements</h2>
          {measurementsData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={measurementsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="no-data">No measurements available</p>
          )}
        </div>
      </div>

      <div className="progress-history">
        <h2>Progress History</h2>
        {sortedProgress.length > 0 ? (
          <div className="progress-table">
            <div className="table-header">
              <span>Date</span>
              <span>Weight</span>
              <span>Body Fat</span>
              <span>Muscle Mass</span>
            </div>
            {sortedProgress.reverse().map(p => (
              <div key={p.id} className="table-row">
                <span>{format(new Date(p.date), 'MMM dd, yyyy')}</span>
                <span>{p.weight} kg</span>
                <span>{p.bodyFat?.toFixed(1) || '-'}%</span>
                <span>{p.muscleMass?.toFixed(1) || '-'} kg</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="no-data">No progress entries yet</p>
        )}
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Log Progress</h2>

            <div className="form-grid">
              <div className="form-field">
                <label>Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) })}
                  className="input-field"
                />
              </div>

              <div className="form-field">
                <label>Body Fat (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.bodyFat}
                  onChange={(e) => setFormData({ ...formData, bodyFat: parseFloat(e.target.value) })}
                  className="input-field"
                />
              </div>

              <div className="form-field">
                <label>Muscle Mass (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.muscleMass}
                  onChange={(e) => setFormData({ ...formData, muscleMass: parseFloat(e.target.value) })}
                  className="input-field"
                />
              </div>
            </div>

            <h3>Measurements (cm)</h3>
            <div className="form-grid">
              <div className="form-field">
                <label>Chest</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.chest}
                  onChange={(e) => setFormData({ ...formData, chest: parseFloat(e.target.value) })}
                  className="input-field"
                />
              </div>

              <div className="form-field">
                <label>Waist</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.waist}
                  onChange={(e) => setFormData({ ...formData, waist: parseFloat(e.target.value) })}
                  className="input-field"
                />
              </div>

              <div className="form-field">
                <label>Hips</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.hips}
                  onChange={(e) => setFormData({ ...formData, hips: parseFloat(e.target.value) })}
                  className="input-field"
                />
              </div>

              <div className="form-field">
                <label>Arms</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.arms}
                  onChange={(e) => setFormData({ ...formData, arms: parseFloat(e.target.value) })}
                  className="input-field"
                />
              </div>

              <div className="form-field">
                <label>Thighs</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.thighs}
                  onChange={(e) => setFormData({ ...formData, thighs: parseFloat(e.target.value) })}
                  className="input-field"
                />
              </div>
            </div>

            <div className="modal-actions">
              <button onClick={() => setShowAddModal(false)} className="cancel-btn">
                Cancel
              </button>
              <button onClick={handleAddProgress} className="confirm-btn">
                Save Progress
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Progress;
