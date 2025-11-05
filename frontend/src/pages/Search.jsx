import { useState, useEffect } from 'react';
import { profileAPI, interestAPI, favoriteAPI } from '../utils/api';
import ProfileCard from '../components/ProfileCard';
import { FaSearch, FaFilter } from 'react-icons/fa';

function Search() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    ageFrom: '',
    ageTo: '',
    heightFrom: '',
    heightTo: '',
    maritalStatus: '',
    education: '',
    occupation: '',
    city: '',
    state: '',
    gotra: '',
    diet: ''
  });

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0
  });

  useEffect(() => {
    handleSearch();
  }, []);

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
  };

  const handleSearch = async (page = 1) => {
    setLoading(true);
    try {
      const params = { ...filters, page };
      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key];
      });

      const response = await profileAPI.search(params);
      setProfiles(response.data.profiles || []);
      setPagination({
        currentPage: response.data.currentPage,
        totalPages: response.data.pages,
        total: response.data.total
      });
    } catch (error) {
      console.error('Search error:', error);
      alert('Failed to search profiles');
    } finally {
      setLoading(false);
    }
  };

  const handleSendInterest = async (profileId) => {
    try {
      await interestAPI.send({ receiverId: profileId });
      alert('Interest sent successfully!');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to send interest');
    }
  };

  const handleAddFavorite = async (profileId) => {
    try {
      await favoriteAPI.add({ profileId });
      alert('Added to favorites!');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to add to favorites');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Search Profiles</h1>
        <p className="text-gray-600 mt-1">Find your perfect match</p>
      </div>

      {/* Filter Toggle */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="mb-4 flex items-center gap-2 btn-primary"
      >
        <FaFilter /> {showFilters ? 'Hide Filters' : 'Show Filters'}
      </button>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Age From
              </label>
              <input
                type="number"
                name="ageFrom"
                className="input-field"
                value={filters.ageFrom}
                onChange={handleFilterChange}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Age To
              </label>
              <input
                type="number"
                name="ageTo"
                className="input-field"
                value={filters.ageTo}
                onChange={handleFilterChange}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Height From (cm)
              </label>
              <input
                type="number"
                name="heightFrom"
                className="input-field"
                value={filters.heightFrom}
                onChange={handleFilterChange}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Height To (cm)
              </label>
              <input
                type="number"
                name="heightTo"
                className="input-field"
                value={filters.heightTo}
                onChange={handleFilterChange}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Marital Status
              </label>
              <select
                name="maritalStatus"
                className="input-field"
                value={filters.maritalStatus}
                onChange={handleFilterChange}
              >
                <option value="">All</option>
                <option value="Never Married">Never Married</option>
                <option value="Divorced">Divorced</option>
                <option value="Widowed">Widowed</option>
                <option value="Separated">Separated</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Education
              </label>
              <input
                type="text"
                name="education"
                className="input-field"
                placeholder="e.g., B.Tech"
                value={filters.education}
                onChange={handleFilterChange}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Occupation
              </label>
              <input
                type="text"
                name="occupation"
                className="input-field"
                placeholder="e.g., Engineer"
                value={filters.occupation}
                onChange={handleFilterChange}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                name="city"
                className="input-field"
                value={filters.city}
                onChange={handleFilterChange}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gotra
              </label>
              <input
                type="text"
                name="gotra"
                className="input-field"
                value={filters.gotra}
                onChange={handleFilterChange}
              />
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={() => handleSearch(1)}
              className="btn-primary"
            >
              <FaSearch className="inline mr-1" /> Search
            </button>
            <button
              onClick={() => {
                setFilters({
                  ageFrom: '',
                  ageTo: '',
                  heightFrom: '',
                  heightTo: '',
                  maritalStatus: '',
                  education: '',
                  occupation: '',
                  city: '',
                  state: '',
                  gotra: '',
                  diet: ''
                });
                handleSearch(1);
              }}
              className="btn-secondary"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      <div>
        <p className="text-gray-600 mb-4">
          Found {pagination.total} profiles
        </p>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Searching...</p>
          </div>
        ) : profiles.length > 0 ? (
          <>
            <div className="grid gap-6">
              {profiles.map((profile) => (
                <ProfileCard
                  key={profile._id}
                  profile={profile}
                  onSendInterest={handleSendInterest}
                  onAddFavorite={handleAddFavorite}
                />
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="mt-8 flex justify-center gap-2">
                <button
                  onClick={() => handleSearch(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1}
                  className="btn-secondary disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-4 py-2">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => handleSearch(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="btn-secondary disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 bg-white rounded-lg shadow">
            <p className="text-gray-600">
              No profiles found matching your criteria
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Search;
