import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaStar, FaExchangeAlt, FaCheck, FaTimes } from 'react-icons/fa';

const Matches = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [findingNew, setFindingNew] = useState(false);

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    try {
      const res = await axios.get('/api/matches');
      setMatches(res.data.data);
    } catch (error) {
      toast.error('Failed to load matches');
    } finally {
      setLoading(false);
    }
  };

  const findNewMatches = async () => {
    setFindingNew(true);
    try {
      await axios.get('/api/matches/find');
      toast.success('Finding new matches...');
      loadMatches();
    } catch (error) {
      toast.error('Failed to find matches');
    } finally {
      setFindingNew(false);
    }
  };

  const handleAccept = async (matchId) => {
    try {
      await axios.put(`/api/matches/${matchId}/accept`);
      toast.success('Match accepted!');
      loadMatches();
    } catch (error) {
      toast.error('Failed to accept match');
    }
  };

  const handleDecline = async (matchId) => {
    try {
      await axios.put(`/api/matches/${matchId}/decline`);
      toast.success('Match declined');
      loadMatches();
    } catch (error) {
      toast.error('Failed to decline match');
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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Skill Matches</h1>
          <p className="text-gray-600 mt-2">Connect with people to exchange skills</p>
        </div>
        <button
          onClick={findNewMatches}
          disabled={findingNew}
          className="btn btn-primary"
        >
          {findingNew ? 'Searching...' : 'Find New Matches'}
        </button>
      </div>

      {matches.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {matches.map((match) => {
            const otherUser = match.user1.userId._id !== match.user1.userId.name
              ? match.user2.userId
              : match.user1.userId;
            const isAccepted = match.status === 'accepted';

            return (
              <div key={match._id} className="card">
                <div className="flex items-center mb-4">
                  <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mr-4">
                    <span className="text-primary-600 font-bold text-2xl">
                      {otherUser.name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <Link to={`/profile/${otherUser._id}`} className="font-semibold text-lg hover:text-primary-600">
                      {otherUser.name}
                    </Link>
                    <div className="flex items-center text-sm text-gray-600">
                      <FaStar className="text-yellow-500 mr-1" />
                      {otherUser.reputation.rating.toFixed(1)}
                      <span className="ml-1">({otherUser.reputation.reviewCount})</span>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-center mb-3">
                    <div className="text-center flex-1">
                      <span className="badge badge-skill">{match.user1.skillOffered}</span>
                    </div>
                    <FaExchangeAlt className="text-primary-600 mx-2" />
                    <div className="text-center flex-1">
                      <span className="badge badge-skill">{match.user2.skillOffered}</span>
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="inline-block px-4 py-2 bg-primary-50 rounded-lg">
                      <span className="text-primary-600 font-semibold">
                        Match Score: {match.matchScore}%
                      </span>
                    </div>
                  </div>
                </div>

                {isAccepted ? (
                  <div className="bg-green-50 text-green-700 py-2 px-4 rounded-lg text-center">
                    <FaCheck className="inline mr-2" />
                    Match Accepted
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAccept(match._id)}
                      className="flex-1 btn btn-primary"
                    >
                      <FaCheck className="inline mr-2" />
                      Accept
                    </button>
                    <button
                      onClick={() => handleDecline(match._id)}
                      className="flex-1 btn btn-secondary"
                    >
                      <FaTimes className="inline mr-2" />
                      Decline
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card text-center py-12">
          <p className="text-gray-600 text-lg mb-4">
            No matches found yet
          </p>
          <p className="text-gray-500 mb-6">
            Make sure you've added skills you can offer and skills you want to learn
          </p>
          <div className="flex justify-center gap-4">
            <Link to="/profile" className="btn btn-primary">
              Update Skills
            </Link>
            <button onClick={findNewMatches} className="btn btn-outline">
              Find Matches
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Matches;
