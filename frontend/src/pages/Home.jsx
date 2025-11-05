import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { FaHeart, FaUsers, FaShieldAlt, FaUserCheck } from 'react-icons/fa';

function Home() {
  const navigate = useNavigate();
  const { token } = useAuthStore();

  if (token) {
    navigate('/dashboard');
    return null;
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary-600 to-pink-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-4">
              Welcome to Sourastra Matrimony
            </h1>
            <p className="text-xl mb-8 text-gray-100">
              Find your perfect life partner within the Sourastra community
            </p>
            <div className="space-x-4">
              <button
                onClick={() => navigate('/register')}
                className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
              >
                Register Free
              </button>
              <button
                onClick={() => navigate('/login')}
                className="bg-transparent border-2 border-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-primary-600 transition"
              >
                Login
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose Us?</h2>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaUsers className="text-primary-600 text-2xl" />
              </div>
              <h3 className="font-bold text-lg mb-2">Community Focused</h3>
              <p className="text-gray-600">
                Exclusively for Sourastra community members
              </p>
            </div>

            <div className="text-center">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaShieldAlt className="text-primary-600 text-2xl" />
              </div>
              <h3 className="font-bold text-lg mb-2">Verified Profiles</h3>
              <p className="text-gray-600">
                All profiles are verified for authenticity
              </p>
            </div>

            <div className="text-center">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaUserCheck className="text-primary-600 text-2xl" />
              </div>
              <h3 className="font-bold text-lg mb-2">Smart Matching</h3>
              <p className="text-gray-600">
                Advanced algorithm for better matches
              </p>
            </div>

            <div className="text-center">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaHeart className="text-primary-600 text-2xl" />
              </div>
              <h3 className="font-bold text-lg mb-2">Privacy Focused</h3>
              <p className="text-gray-600">
                Your data is safe and secure with us
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-primary-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Start Your Journey Today
          </h2>
          <p className="text-xl mb-8">
            Join thousands of Sourastra community members finding their life partners
          </p>
          <button
            onClick={() => navigate('/register')}
            className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
          >
            Create Your Profile Now
          </button>
        </div>
      </div>
    </div>
  );
}

export default Home;
