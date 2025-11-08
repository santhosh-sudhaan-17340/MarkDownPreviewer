import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FaStar, FaClock, FaExchangeAlt } from 'react-icons/fa';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    upcomingSessions: [],
    recentMatches: [],
    loading: true
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [sessionsRes, matchesRes] = await Promise.all([
        axios.get('/api/sessions?upcoming=true'),
        axios.get('/api/matches')
      ]);

      setStats({
        upcomingSessions: sessionsRes.data.data.slice(0, 3),
        recentMatches: matchesRes.data.data.slice(0, 5),
        loading: false
      });
    } catch (error) {
      toast.error('Failed to load dashboard data');
      setStats({ ...stats, loading: false });
    }
  };

  if (stats.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user.name}!</h1>
        <p className="text-gray-600 mt-2">Here's what's happening with your skill exchanges</p>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="card bg-gradient-to-br from-primary-500 to-primary-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-100">Time Credits</p>
              <p className="text-3xl font-bold">{user.timeCredits}</p>
            </div>
            <FaClock className="text-4xl text-primary-200" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-yellow-400 to-yellow-500 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100">Reputation</p>
              <p className="text-3xl font-bold flex items-center">
                {user.reputation.rating.toFixed(1)}
                <FaStar className="ml-2 text-2xl" />
              </p>
              <p className="text-sm text-yellow-100">{user.reputation.reviewCount} reviews</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100">Sessions Completed</p>
              <p className="text-3xl font-bold">{user.completedSessions}</p>
            </div>
            <FaExchangeAlt className="text-4xl text-green-200" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Link to="/matches" className="card hover:shadow-lg transition-shadow">
          <h3 className="text-xl font-semibold mb-2">Find Matches</h3>
          <p className="text-gray-600 mb-4">
            Discover people who want to learn what you know and can teach what you want
          </p>
          <span className="text-primary-600 font-medium">Browse Matches →</span>
        </Link>

        <Link to="/profile" className="card hover:shadow-lg transition-shadow">
          <h3 className="text-xl font-semibold mb-2">Update Your Skills</h3>
          <p className="text-gray-600 mb-4">
            Add skills you can teach or skills you want to learn
          </p>
          <span className="text-primary-600 font-medium">Edit Profile →</span>
        </Link>
      </div>

      {/* Upcoming Sessions */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Upcoming Sessions</h2>
          <Link to="/sessions" className="text-primary-600 hover:text-primary-700">
            View all
          </Link>
        </div>
        {stats.upcomingSessions.length > 0 ? (
          <div className="space-y-4">
            {stats.upcomingSessions.map((session) => (
              <div key={session._id} className="card flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-lg">{session.skill}</h3>
                  <p className="text-gray-600">
                    with {session.teacher._id === user._id ? session.learner.name : session.teacher.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(session.scheduledStart).toLocaleString()}
                  </p>
                </div>
                <Link
                  to={`/sessions/${session._id}`}
                  className="btn btn-primary"
                >
                  View Details
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center text-gray-500">
            <p>No upcoming sessions. Find matches to get started!</p>
          </div>
        )}
      </div>

      {/* Recent Matches */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Recent Matches</h2>
          <Link to="/matches" className="text-primary-600 hover:text-primary-700">
            View all
          </Link>
        </div>
        {stats.recentMatches.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.recentMatches.map((match) => {
              const otherUser = match.user1.userId._id === user._id ? match.user2.userId : match.user1.userId;
              return (
                <div key={match._id} className="card">
                  <div className="flex items-center mb-2">
                    <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-primary-600 font-semibold text-xl">
                        {otherUser.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold">{otherUser.name}</h3>
                      <div className="flex items-center text-sm text-gray-600">
                        <FaStar className="text-yellow-500 mr-1" />
                        {otherUser.reputation.rating.toFixed(1)}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    Match Score: {match.matchScore}%
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card text-center text-gray-500">
            <p>No matches yet. Update your skills to find matches!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
