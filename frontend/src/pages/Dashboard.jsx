import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { profileAPI, interestAPI, favoriteAPI } from '../utils/api';
import ProfileCard from '../components/ProfileCard';
import { FaEnvelope, FaStar, FaEye, FaUserCheck } from 'react-icons/fa';

function Dashboard() {
  const { user } = useAuthStore();
  const [recommendations, setRecommendations] = useState([]);
  const [stats, setStats] = useState({
    sentInterests: 0,
    receivedInterests: 0,
    favorites: 0,
    profileViews: user?.profileViews || 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [recsRes, sentRes, receivedRes, favsRes] = await Promise.all([
        profileAPI.getRecommendations(),
        interestAPI.getSent(),
        interestAPI.getReceived(),
        favoriteAPI.getAll()
      ]);

      setRecommendations(recsRes.data.profiles || []);
      setStats({
        sentInterests: sentRes.data.count || 0,
        receivedInterests: receivedRes.data.count || 0,
        favorites: favsRes.data.count || 0,
        profileViews: user?.profileViews || 0
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendInterest = async (profileId) => {
    try {
      await interestAPI.send({ receiverId: profileId });
      alert('Interest sent successfully!');
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to send interest');
    }
  };

  const handleAddFavorite = async (profileId) => {
    try {
      await favoriteAPI.add({ profileId });
      alert('Added to favorites!');
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to add to favorites');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome, {user?.firstName}!
        </h1>
        <p className="text-gray-600 mt-1">
          Find your perfect match from our community
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Profile Views</p>
              <p className="text-2xl font-bold text-gray-900">{stats.profileViews}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <FaEye className="text-blue-600 text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Interests Sent</p>
              <p className="text-2xl font-bold text-gray-900">{stats.sentInterests}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <FaEnvelope className="text-green-600 text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Interests Received</p>
              <p className="text-2xl font-bold text-gray-900">{stats.receivedInterests}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <FaUserCheck className="text-purple-600 text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Favorites</p>
              <p className="text-2xl font-bold text-gray-900">{stats.favorites}</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-full">
              <FaStar className="text-yellow-600 text-xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Profile Completion Alert */}
      {!user?.profileCompleted && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-8">
          <p className="font-bold">Complete Your Profile</p>
          <p>Your profile is incomplete. Please complete it to get better matches.</p>
          <a href="/my-profile" className="underline">Complete now</a>
        </div>
      )}

      {/* Recommendations */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Recommended Matches
        </h2>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Loading recommendations...</p>
          </div>
        ) : recommendations.length > 0 ? (
          <div className="grid gap-6">
            {recommendations.map((profile) => (
              <ProfileCard
                key={profile._id}
                profile={profile}
                onSendInterest={handleSendInterest}
                onAddFavorite={handleAddFavorite}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-white rounded-lg shadow">
            <p className="text-gray-600">
              No recommendations available at the moment. Try updating your partner preferences.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
