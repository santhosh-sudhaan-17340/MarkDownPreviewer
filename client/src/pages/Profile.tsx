import { useState } from 'react';
import { useStore } from '../store';
import { User as UserIcon, Save } from 'lucide-react';
import './Profile.css';

const Profile = () => {
  const { user, setUser } = useStore();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState(user || {
    id: 'demo',
    name: '',
    email: '',
    age: 25,
    height: 170,
    weight: 70,
    gender: 'male' as const,
    fitnessGoal: 'maintain' as const,
    activityLevel: 'moderate' as const
  });

  const handleSave = () => {
    setUser(formData);
    setEditing(false);
  };

  return (
    <div className="profile-page">
      <div className="page-header">
        <h1><UserIcon size={32} /> Profile Settings</h1>
        <p>Manage your personal information and fitness goals</p>
      </div>

      <div className="profile-container">
        <div className="profile-card">
          <div className="profile-header">
            <div className="profile-avatar">
              {formData.name.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="profile-info">
              <h2>{formData.name || 'User'}</h2>
              <p>{formData.email}</p>
            </div>
          </div>

          <div className="profile-form">
            <h3>Personal Information</h3>

            <div className="form-row">
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={!editing}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!editing}
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Age</label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) })}
                  disabled={!editing}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                  disabled={!editing}
                  className="form-input"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Height (cm)</label>
                <input
                  type="number"
                  value={formData.height}
                  onChange={(e) => setFormData({ ...formData, height: parseInt(e.target.value) })}
                  disabled={!editing}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Weight (kg)</label>
                <input
                  type="number"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: parseInt(e.target.value) })}
                  disabled={!editing}
                  className="form-input"
                />
              </div>
            </div>

            <h3>Fitness Information</h3>

            <div className="form-group">
              <label>Fitness Goal</label>
              <select
                value={formData.fitnessGoal}
                onChange={(e) => setFormData({ ...formData, fitnessGoal: e.target.value as any })}
                disabled={!editing}
                className="form-input"
              >
                <option value="lose_weight">Lose Weight</option>
                <option value="gain_muscle">Gain Muscle</option>
                <option value="maintain">Maintain Weight</option>
                <option value="improve_endurance">Improve Endurance</option>
              </select>
            </div>

            <div className="form-group">
              <label>Activity Level</label>
              <select
                value={formData.activityLevel}
                onChange={(e) => setFormData({ ...formData, activityLevel: e.target.value as any })}
                disabled={!editing}
                className="form-input"
              >
                <option value="sedentary">Sedentary (little or no exercise)</option>
                <option value="light">Light (exercise 1-3 days/week)</option>
                <option value="moderate">Moderate (exercise 3-5 days/week)</option>
                <option value="active">Active (exercise 6-7 days/week)</option>
                <option value="very_active">Very Active (intense exercise daily)</option>
              </select>
            </div>

            <div className="form-actions">
              {editing ? (
                <>
                  <button onClick={() => setEditing(false)} className="cancel-btn">
                    Cancel
                  </button>
                  <button onClick={handleSave} className="save-btn">
                    <Save size={20} />
                    Save Changes
                  </button>
                </>
              ) : (
                <button onClick={() => setEditing(true)} className="edit-btn">
                  Edit Profile
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="stats-card">
          <h3>Quick Stats</h3>

          <div className="stat-item">
            <span className="stat-label">BMI</span>
            <span className="stat-value">
              {(formData.weight / Math.pow(formData.height / 100, 2)).toFixed(1)}
            </span>
          </div>

          <div className="stat-item">
            <span className="stat-label">BMR (Basal Metabolic Rate)</span>
            <span className="stat-value">
              {Math.round(
                formData.gender === 'male'
                  ? 88.362 + 13.397 * formData.weight + 4.799 * formData.height - 5.677 * formData.age
                  : 447.593 + 9.247 * formData.weight + 3.098 * formData.height - 4.330 * formData.age
              )}{' '}
              kcal
            </span>
          </div>

          <div className="stat-item">
            <span className="stat-label">Daily Calorie Goal</span>
            <span className="stat-value">
              {Math.round(
                (formData.gender === 'male'
                  ? 88.362 + 13.397 * formData.weight + 4.799 * formData.height - 5.677 * formData.age
                  : 447.593 + 9.247 * formData.weight + 3.098 * formData.height - 4.330 * formData.age) *
                  {
                    sedentary: 1.2,
                    light: 1.375,
                    moderate: 1.55,
                    active: 1.725,
                    very_active: 1.9
                  }[formData.activityLevel]
              )}{' '}
              kcal
            </span>
          </div>

          <div className="stat-item">
            <span className="stat-label">Recommended Protein</span>
            <span className="stat-value">
              {Math.round(formData.weight * 1.6)} g/day
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
