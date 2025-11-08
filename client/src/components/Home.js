import React, { useState } from 'react';
import './Home.css';

function Home({ onJoinClass }) {
  const [classId, setClassId] = useState('');
  const [userName, setUserName] = useState('');
  const [role, setRole] = useState('student');

  const handleJoin = (e) => {
    e.preventDefault();
    if (classId.trim() && userName.trim()) {
      onJoinClass({
        classId: classId.trim(),
        userName: userName.trim(),
        userId: `user_${Date.now()}`,
        role
      });
    }
  };

  const createQuickClass = () => {
    const quickClassId = `class_${Date.now()}`;
    setClassId(quickClassId);
  };

  return (
    <div className="home-container">
      <div className="home-card">
        <h1 className="home-title">E-Learning Live Class</h1>
        <p className="home-subtitle">Join or create a live interactive classroom</p>

        <form onSubmit={handleJoin} className="home-form">
          <div className="form-group">
            <label htmlFor="userName">Your Name</label>
            <input
              type="text"
              id="userName"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Enter your name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="classId">Class ID</label>
            <div className="class-id-input">
              <input
                type="text"
                id="classId"
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                placeholder="Enter class ID or create new"
                required
              />
              <button
                type="button"
                onClick={createQuickClass}
                className="btn-create-class"
              >
                Create New
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Join as</label>
            <div className="role-selector">
              <label className={`role-option ${role === 'student' ? 'active' : ''}`}>
                <input
                  type="radio"
                  value="student"
                  checked={role === 'student'}
                  onChange={(e) => setRole(e.target.value)}
                />
                Student
              </label>
              <label className={`role-option ${role === 'instructor' ? 'active' : ''}`}>
                <input
                  type="radio"
                  value="instructor"
                  checked={role === 'instructor'}
                  onChange={(e) => setRole(e.target.value)}
                />
                Instructor
              </label>
            </div>
          </div>

          <button type="submit" className="btn-join">
            Join Class
          </button>
        </form>

        <div className="features-list">
          <h3>Features:</h3>
          <ul>
            <li>Low-latency live video streaming</li>
            <li>Screen sharing capability</li>
            <li>Real-time quizzes and polls</li>
            <li>Attendance tracking</li>
            <li>Assignment uploads</li>
            <li>Breakout rooms</li>
            <li>Live chat and Q&A</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Home;
