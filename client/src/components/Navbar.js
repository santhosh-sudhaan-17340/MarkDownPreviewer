import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaExchangeAlt, FaUser, FaSignOutAlt } from 'react-icons/fa';

const Navbar = () => {
  const { user, logout } = useAuth();
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
            <Link to="/" className="flex items-center">
              <FaExchangeAlt className="text-primary-600 text-2xl mr-2" />
              <span className="text-xl font-bold text-gray-800">SkillSwap</span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link to="/dashboard" className="text-gray-700 hover:text-primary-600 px-3 py-2">
                  Dashboard
                </Link>
                <Link to="/matches" className="text-gray-700 hover:text-primary-600 px-3 py-2">
                  Matches
                </Link>
                <Link to="/sessions" className="text-gray-700 hover:text-primary-600 px-3 py-2">
                  Sessions
                </Link>
                <div className="flex items-center space-x-2 border-l pl-4">
                  <div className="text-sm">
                    <div className="font-medium text-gray-700">{user.name}</div>
                    <div className="text-primary-600">{user.timeCredits} credits</div>
                  </div>
                  <Link to="/profile" className="text-gray-700 hover:text-primary-600">
                    <FaUser className="text-xl" />
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="text-gray-700 hover:text-red-600"
                  >
                    <FaSignOutAlt className="text-xl" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="text-gray-700 hover:text-primary-600 px-3 py-2">
                  Login
                </Link>
                <Link to="/register" className="btn btn-primary">
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
