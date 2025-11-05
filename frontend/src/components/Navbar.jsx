import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { FaHeart, FaUser, FaSearch, FaStar, FaEnvelope, FaSignOutAlt, FaUserShield } from 'react-icons/fa';

function Navbar() {
  const { user, token, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <FaHeart className="text-primary-600 text-2xl" />
              <span className="text-2xl font-bold text-gray-900">
                Sourastra <span className="text-primary-600">Matrimony</span>
              </span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {token ? (
              <>
                <Link to="/dashboard" className="nav-link">
                  <FaUser className="inline mr-1" /> Dashboard
                </Link>
                <Link to="/search" className="nav-link">
                  <FaSearch className="inline mr-1" /> Search
                </Link>
                <Link to="/interests" className="nav-link">
                  <FaEnvelope className="inline mr-1" /> Interests
                </Link>
                <Link to="/favorites" className="nav-link">
                  <FaStar className="inline mr-1" /> Favorites
                </Link>
                <Link to="/my-profile" className="nav-link">
                  <FaUser className="inline mr-1" /> My Profile
                </Link>
                {user?.role === 'admin' && (
                  <Link to="/admin" className="nav-link text-primary-600">
                    <FaUserShield className="inline mr-1" /> Admin
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  <FaSignOutAlt />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="nav-link">
                  Login
                </Link>
                <Link to="/register" className="btn-primary">
                  Register Free
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
