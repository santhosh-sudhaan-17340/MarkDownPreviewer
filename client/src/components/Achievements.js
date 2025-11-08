import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Trophy, Lock } from 'lucide-react';
import './Achievements.css';

function Achievements({ user }) {
  const [achievements, setAchievements] = useState([]);
  const [available, setAvailable] = useState([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAchievements();
  }, []);

  const fetchAchievements = async () => {
    try {
      const [unlockedRes, availableRes] = await Promise.all([
        axios.get('/achievements'),
        axios.get('/achievements/available')
      ]);

      setAchievements(unlockedRes.data.achievements);
      setTotalPoints(unlockedRes.data.totalPoints);
      setAvailable(availableRes.data);
    } catch (error) {
      console.error('Error fetching achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="spinner"></div>;
  }

  const allAchievements = [
    ...achievements.map(a => ({ ...a, unlocked: true })),
    ...available.map(a => ({ ...a, unlocked: false }))
  ];

  return (
    <div className="achievements-page">
      <div className="achievements-header">
        <h1 className="page-title">Achievements</h1>
        <div className="points-badge">
          <Trophy size={24} />
          <div>
            <div className="points-value">{totalPoints}</div>
            <div className="points-label">Total Points</div>
          </div>
        </div>
      </div>

      <div className="achievements-stats">
        <div className="stat">
          <div className="stat-value">{achievements.length}</div>
          <div className="stat-label">Unlocked</div>
        </div>
        <div className="stat">
          <div className="stat-value">{available.length}</div>
          <div className="stat-label">Locked</div>
        </div>
        <div className="stat">
          <div className="stat-value">{allAchievements.length}</div>
          <div className="stat-label">Total</div>
        </div>
      </div>

      <div className="achievements-sections">
        {achievements.length > 0 && (
          <div className="achievements-section">
            <h2 className="section-title">Unlocked Achievements</h2>
            <div className="achievements-grid">
              {achievements.map(achievement => (
                <div key={achievement.id} className="achievement-card unlocked">
                  <div className="achievement-icon">{achievement.icon}</div>
                  <div className="achievement-content">
                    <h3 className="achievement-title">{achievement.title}</h3>
                    <p className="achievement-description">{achievement.description}</p>
                    <div className="achievement-footer">
                      <span className="achievement-points">+{achievement.points} pts</span>
                      <span className="achievement-date">
                        {new Date(achievement.unlocked_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {available.length > 0 && (
          <div className="achievements-section">
            <h2 className="section-title">Locked Achievements</h2>
            <div className="achievements-grid">
              {available.map((achievement, index) => (
                <div key={index} className="achievement-card locked">
                  <div className="achievement-icon">
                    <Lock size={32} />
                  </div>
                  <div className="achievement-content">
                    <h3 className="achievement-title">{achievement.title}</h3>
                    <p className="achievement-description">{achievement.description}</p>
                    <div className="achievement-footer">
                      <span className="achievement-points">+{achievement.points} pts</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {achievements.length === 0 && available.length === 0 && (
          <div className="no-achievements">
            <Trophy size={64} />
            <p>No achievements available yet!</p>
            <p>Start tracking expenses to unlock achievements.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Achievements;
