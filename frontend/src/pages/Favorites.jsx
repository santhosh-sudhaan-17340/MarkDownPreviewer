import { useState, useEffect } from 'react';
import { favoriteAPI } from '../utils/api';
import ProfileCard from '../components/ProfileCard';
import { FaTrash } from 'react-icons/fa';

function Favorites() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    setLoading(true);
    try {
      const response = await favoriteAPI.getAll();
      setFavorites(response.data.favorites || []);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id) => {
    if (!confirm('Remove from favorites?')) return;

    try {
      await favoriteAPI.remove(id);
      setFavorites(favorites.filter(fav => fav._id !== id));
      alert('Removed from favorites');
    } catch (error) {
      alert('Failed to remove from favorites');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Favorites</h1>
        <p className="text-gray-600 mt-1">
          {favorites.length} profile{favorites.length !== 1 ? 's' : ''} in your favorites
        </p>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-600">Loading favorites...</p>
        </div>
      ) : favorites.length > 0 ? (
        <div className="space-y-4">
          {favorites.map((favorite) => (
            <div key={favorite._id} className="relative">
              <ProfileCard profile={favorite.favoriteProfile} />
              <button
                onClick={() => handleRemove(favorite._id)}
                className="absolute top-4 right-4 bg-red-600 text-white p-3 rounded-full hover:bg-red-700 shadow-lg"
                title="Remove from favorites"
              >
                <FaTrash />
              </button>
              {favorite.notes && (
                <div className="mt-2 bg-gray-50 p-3 rounded">
                  <p className="text-sm text-gray-700">
                    <strong>Notes:</strong> {favorite.notes}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-600 text-lg">No favorites yet</p>
          <p className="text-gray-500 mt-2">
            Start adding profiles to your favorites from the search page
          </p>
        </div>
      )}
    </div>
  );
}

export default Favorites;
