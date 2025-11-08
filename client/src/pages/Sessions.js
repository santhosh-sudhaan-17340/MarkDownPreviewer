import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FaVideo, FaCalendar, FaClock } from 'react-icons/fa';

const Sessions = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [filter, setFilter] = useState('upcoming');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, [filter]);

  const loadSessions = async () => {
    try {
      const params = {};
      if (filter === 'upcoming') {
        params.upcoming = 'true';
      } else if (filter !== 'all') {
        params.status = filter;
      }

      const queryString = new URLSearchParams(params).toString();
      const res = await axios.get(`/api/sessions?${queryString}`);
      setSessions(res.data.data);
    } catch (error) {
      toast.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSession = async (sessionId) => {
    if (!window.confirm('Are you sure you want to cancel this session?')) return;

    try {
      await axios.put(`/api/sessions/${sessionId}/cancel`, {
        reason: 'User cancelled'
      });
      toast.success('Session cancelled');
      loadSessions();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cancel session');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'in-progress':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">My Sessions</h1>

        {/* Filter Tabs */}
        <div className="flex space-x-2 border-b">
          {['upcoming', 'scheduled', 'completed', 'cancelled', 'all'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 font-medium capitalize ${
                filter === tab
                  ? 'border-b-2 border-primary-600 text-primary-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {sessions.length > 0 ? (
        <div className="space-y-4">
          {sessions.map((session) => {
            const isTeacher = session.teacher._id === user._id;
            const otherUser = isTeacher ? session.learner : session.teacher;
            const canJoin = session.status === 'scheduled' &&
              new Date(session.scheduledStart) <= new Date(new Date().getTime() + 10 * 60000); // 10 min before

            return (
              <div key={session._id} className="card">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold">{session.skill}</h3>
                      <span className={`badge ${getStatusColor(session.status)}`}>
                        {session.status}
                      </span>
                    </div>

                    <div className="flex items-center text-gray-600 mb-2">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-primary-600 font-semibold">
                          {otherUser.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">
                          {isTeacher ? 'Teaching' : 'Learning from'} {otherUser.name}
                        </p>
                        <div className="flex items-center text-sm">
                          <FaStar className="text-yellow-500 mr-1" />
                          {otherUser.reputation.rating.toFixed(1)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-sm text-gray-600">
                      <div className="flex items-center">
                        <FaCalendar className="mr-2" />
                        {new Date(session.scheduledStart).toLocaleDateString()}
                      </div>
                      <div className="flex items-center">
                        <FaClock className="mr-2" />
                        {new Date(session.scheduledStart).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                      <div>
                        Duration: {session.duration} min
                      </div>
                      <div className="text-primary-600 font-medium">
                        {session.creditsLocked} credits
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    {canJoin && (
                      <Link
                        to={`/video/${session.videoRoomId}`}
                        className="btn btn-primary flex items-center"
                      >
                        <FaVideo className="mr-2" />
                        Join Session
                      </Link>
                    )}
                    {session.status === 'scheduled' && (
                      <button
                        onClick={() => handleCancelSession(session._id)}
                        className="btn btn-secondary"
                      >
                        Cancel
                      </button>
                    )}
                    {session.status === 'completed' && (
                      <Link
                        to={`/sessions/${session._id}/review`}
                        className="btn btn-outline"
                      >
                        Leave Review
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card text-center py-12">
          <p className="text-gray-600 text-lg mb-4">
            No {filter !== 'all' ? filter : ''} sessions found
          </p>
          <Link to="/matches" className="btn btn-primary">
            Find Matches to Schedule Sessions
          </Link>
        </div>
      )}
    </div>
  );
};

export default Sessions;
