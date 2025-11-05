import { useState, useEffect } from 'react';
import { interestAPI } from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { FaCheck, FaTimes, FaTrash } from 'react-icons/fa';

function Interests() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('received');
  const [sent, setSent] = useState([]);
  const [received, setReceived] = useState([]);
  const [accepted, setAccepted] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInterests();
  }, []);

  const fetchInterests = async () => {
    setLoading(true);
    try {
      const [sentRes, receivedRes, acceptedRes] = await Promise.all([
        interestAPI.getSent(),
        interestAPI.getReceived(),
        interestAPI.getAccepted()
      ]);

      setSent(sentRes.data.interests || []);
      setReceived(receivedRes.data.interests || []);
      setAccepted(acceptedRes.data.interests || []);
    } catch (error) {
      console.error('Error fetching interests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (id) => {
    const message = prompt('Enter a message (optional):');
    try {
      await interestAPI.accept(id, message);
      alert('Interest accepted!');
      fetchInterests();
    } catch (error) {
      alert('Failed to accept interest');
    }
  };

  const handleReject = async (id) => {
    if (!confirm('Are you sure you want to reject this interest?')) return;
    try {
      await interestAPI.reject(id, '');
      alert('Interest rejected');
      fetchInterests();
    } catch (error) {
      alert('Failed to reject interest');
    }
  };

  const handleCancel = async (id) => {
    if (!confirm('Are you sure you want to cancel this interest?')) return;
    try {
      await interestAPI.cancel(id);
      alert('Interest cancelled');
      fetchInterests();
    } catch (error) {
      alert('Failed to cancel interest');
    }
  };

  const renderInterestCard = (interest, type) => {
    const profile = type === 'sent' ? interest.receiver : interest.sender;
    if (!profile) return null;

    return (
      <div key={interest._id} className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div
            className="flex-shrink-0 cursor-pointer"
            onClick={() => navigate(`/profile/${profile._id}`)}
          >
            <img
              src={profile.profilePhoto || '/default-avatar.png'}
              alt={`${profile.firstName} ${profile.lastName}`}
              className="w-24 h-24 object-cover rounded-lg"
            />
          </div>

          <div className="flex-1">
            <h3
              className="text-lg font-bold text-gray-900 cursor-pointer hover:text-primary-600"
              onClick={() => navigate(`/profile/${profile._id}`)}
            >
              {profile.firstName} {profile.lastName}
            </h3>
            <p className="text-gray-600 text-sm">
              {profile.age} years | {profile.occupation} | {profile.education}
            </p>
            {profile.city && (
              <p className="text-gray-600 text-sm">{profile.city}</p>
            )}

            {interest.message && (
              <div className="mt-2 bg-gray-50 p-3 rounded">
                <p className="text-sm text-gray-700">{interest.message}</p>
              </div>
            )}

            <div className="mt-2 text-xs text-gray-500">
              {new Date(interest.createdAt).toLocaleDateString()}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {type === 'received' && interest.status === 'pending' && (
                <>
                  <button
                    onClick={() => handleAccept(interest._id)}
                    className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                  >
                    <FaCheck /> Accept
                  </button>
                  <button
                    onClick={() => handleReject(interest._id)}
                    className="flex items-center gap-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                  >
                    <FaTimes /> Reject
                  </button>
                </>
              )}

              {type === 'sent' && interest.status === 'pending' && (
                <button
                  onClick={() => handleCancel(interest._id)}
                  className="flex items-center gap-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
                >
                  <FaTrash /> Cancel
                </button>
              )}

              {interest.status === 'accepted' && (
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                  ✓ Accepted
                </span>
              )}

              {interest.status === 'rejected' && (
                <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm">
                  ✗ Rejected
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Interests</h1>
        <p className="text-gray-600 mt-1">Manage your sent and received interests</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('received')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'received'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Received ({received.length})
            </button>
            <button
              onClick={() => setActiveTab('sent')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'sent'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Sent ({sent.length})
            </button>
            <button
              onClick={() => setActiveTab('accepted')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'accepted'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Accepted ({accepted.length})
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-600">Loading...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeTab === 'received' && (
            <>
              {received.length > 0 ? (
                received.map(interest => renderInterestCard(interest, 'received'))
              ) : (
                <div className="text-center py-8 bg-white rounded-lg shadow">
                  <p className="text-gray-600">No received interests</p>
                </div>
              )}
            </>
          )}

          {activeTab === 'sent' && (
            <>
              {sent.length > 0 ? (
                sent.map(interest => renderInterestCard(interest, 'sent'))
              ) : (
                <div className="text-center py-8 bg-white rounded-lg shadow">
                  <p className="text-gray-600">No sent interests</p>
                </div>
              )}
            </>
          )}

          {activeTab === 'accepted' && (
            <>
              {accepted.length > 0 ? (
                accepted.map(interest => renderInterestCard(interest, 'accepted'))
              ) : (
                <div className="text-center py-8 bg-white rounded-lg shadow">
                  <p className="text-gray-600">No accepted interests</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default Interests;
