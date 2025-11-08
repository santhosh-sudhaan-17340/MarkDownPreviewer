import { useState } from 'react';
import { useStore } from '../store';
import { format } from 'date-fns';
import { Watch, Activity, Heart, Moon, Footprints, Flame, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './Wearables.css';

const Wearables = () => {
  const { user, wearableData, addWearableData } = useStore();
  const [syncing, setSyncing] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<string>('');

  const devices = [
    { id: 'fitbit', name: 'Fitbit', icon: '🏃' },
    { id: 'apple_watch', name: 'Apple Watch', icon: '⌚' },
    { id: 'garmin', name: 'Garmin', icon: '🎯' },
    { id: 'samsung', name: 'Samsung Galaxy Watch', icon: '⌚' }
  ];

  const sortedData = [...wearableData].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const latestData = sortedData[sortedData.length - 1];

  const stepsData = sortedData.slice(-7).map(d => ({
    date: format(new Date(d.date), 'MM/dd'),
    steps: d.steps
  }));

  const heartRateData = latestData?.heartRate.map((hr, idx) => ({
    time: `${idx}:00`,
    hr
  })) || [];

  const handleSync = (deviceId: string) => {
    setSelectedDevice(deviceId);
    setSyncing(true);

    // Simulate syncing data from wearable
    setTimeout(() => {
      const mockData = {
        id: Date.now().toString(),
        userId: user?.id || 'demo',
        date: new Date().toISOString().split('T')[0],
        steps: Math.floor(Math.random() * 5000) + 5000,
        heartRate: Array.from({ length: 24 }, () => Math.floor(Math.random() * 40) + 60),
        sleepHours: Math.random() * 3 + 6,
        activeMinutes: Math.floor(Math.random() * 60) + 30,
        caloriesBurned: Math.floor(Math.random() * 500) + 300,
        distance: (Math.random() * 5 + 3).toFixed(1) as any,
        source: deviceId as any
      };

      addWearableData(mockData);
      setSyncing(false);
      setSelectedDevice('');
    }, 2000);
  };

  return (
    <div className="wearables-page">
      <div className="page-header">
        <h1><Watch size={32} /> Wearable Devices</h1>
        <p>Sync and monitor data from your fitness trackers</p>
      </div>

      <div className="devices-grid">
        {devices.map(device => (
          <div key={device.id} className="device-card">
            <div className="device-icon">{device.icon}</div>
            <h3>{device.name}</h3>
            <button
              onClick={() => handleSync(device.id)}
              disabled={syncing}
              className="sync-btn"
            >
              <RefreshCw size={16} className={syncing && selectedDevice === device.id ? 'spinning' : ''} />
              {syncing && selectedDevice === device.id ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>
        ))}
      </div>

      {latestData && (
        <>
          <div className="today-stats">
            <h2>Today's Activity</h2>
            <div className="activity-cards">
              <div className="activity-card">
                <div className="activity-icon" style={{ background: '#dbeafe' }}>
                  <Footprints size={24} color="#3b82f6" />
                </div>
                <div className="activity-info">
                  <h3>Steps</h3>
                  <p className="activity-value">{latestData.steps.toLocaleString()}</p>
                  <span className="activity-goal">of 10,000 goal</span>
                </div>
                <div className="activity-progress">
                  <div
                    className="progress-bar"
                    style={{ width: `${Math.min((latestData.steps / 10000) * 100, 100)}%` }}
                  />
                </div>
              </div>

              <div className="activity-card">
                <div className="activity-icon" style={{ background: '#fee2e2' }}>
                  <Heart size={24} color="#ef4444" />
                </div>
                <div className="activity-info">
                  <h3>Avg Heart Rate</h3>
                  <p className="activity-value">
                    {Math.round(latestData.heartRate.reduce((a, b) => a + b, 0) / latestData.heartRate.length)} bpm
                  </p>
                  <span className="activity-goal">resting</span>
                </div>
              </div>

              <div className="activity-card">
                <div className="activity-icon" style={{ background: '#f3e8ff' }}>
                  <Moon size={24} color="#a855f7" />
                </div>
                <div className="activity-info">
                  <h3>Sleep</h3>
                  <p className="activity-value">{latestData.sleepHours.toFixed(1)} hrs</p>
                  <span className="activity-goal">last night</span>
                </div>
              </div>

              <div className="activity-card">
                <div className="activity-icon" style={{ background: '#dcfce7' }}>
                  <Activity size={24} color="#10b981" />
                </div>
                <div className="activity-info">
                  <h3>Active Minutes</h3>
                  <p className="activity-value">{latestData.activeMinutes}</p>
                  <span className="activity-goal">today</span>
                </div>
              </div>

              <div className="activity-card">
                <div className="activity-icon" style={{ background: '#fef3c7' }}>
                  <Flame size={24} color="#f59e0b" />
                </div>
                <div className="activity-info">
                  <h3>Calories Burned</h3>
                  <p className="activity-value">{latestData.caloriesBurned}</p>
                  <span className="activity-goal">kcal</span>
                </div>
              </div>

              <div className="activity-card">
                <div className="activity-icon" style={{ background: '#e0e7ff' }}>
                  <Footprints size={24} color="#6366f1" />
                </div>
                <div className="activity-info">
                  <h3>Distance</h3>
                  <p className="activity-value">{latestData.distance} km</p>
                  <span className="activity-goal">traveled</span>
                </div>
              </div>
            </div>
          </div>

          <div className="charts-section">
            <div className="chart-card">
              <h2>Steps (Last 7 Days)</h2>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={stepsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="steps" stroke="#6366f1" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h2>Heart Rate (24 Hours)</h2>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={heartRateData.filter((_, i) => i % 2 === 0)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis domain={[50, 120]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="hr" stroke="#ef4444" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {!latestData && (
        <div className="no-data-message">
          <Watch size={64} color="#cbd5e1" />
          <h3>No Wearable Data</h3>
          <p>Sync your wearable device to see your activity data here</p>
        </div>
      )}
    </div>
  );
};

export default Wearables;
