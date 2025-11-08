import React from 'react';
import { Link } from 'react-router-dom';
import { FaExchangeAlt, FaStar, FaVideo, FaShieldAlt } from 'react-icons/fa';

const Home = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-6">Trade Skills, Not Money</h1>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Exchange your expertise with others. Learn coding, get guitar lessons, teach design,
              master a new language - all without spending a dime.
            </p>
            <div className="space-x-4">
              <Link to="/register" className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 inline-block">
                Get Started
              </Link>
              <Link to="/login" className="border-2 border-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-primary-600 inline-block">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <FaExchangeAlt className="text-4xl text-primary-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Smart Matching</h3>
              <p className="text-gray-600">
                Our algorithm finds the perfect skill exchange partners based on your expertise and learning goals.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <FaStar className="text-4xl text-primary-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Reputation System</h3>
              <p className="text-gray-600">
                Build trust with detailed reviews and ratings from your skill exchange sessions.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <FaVideo className="text-4xl text-primary-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Video Sessions</h3>
              <p className="text-gray-600">
                Connect face-to-face with integrated video calling for effective learning.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <FaShieldAlt className="text-4xl text-primary-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Time Escrow</h3>
              <p className="text-gray-600">
                Fair exchange guaranteed with our time credit escrow system.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Example Skills Section */}
      <div className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Popular Skill Exchanges</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="border-2 border-primary-200 rounded-lg p-6 hover:border-primary-500 transition-colors">
              <div className="text-center">
                <div className="text-4xl mb-4">💻</div>
                <h3 className="text-xl font-semibold mb-2">Coding ↔ Design</h3>
                <p className="text-gray-600">
                  Trade web development skills for graphic design expertise
                </p>
              </div>
            </div>

            <div className="border-2 border-primary-200 rounded-lg p-6 hover:border-primary-500 transition-colors">
              <div className="text-center">
                <div className="text-4xl mb-4">🎸</div>
                <h3 className="text-xl font-semibold mb-2">Music ↔ Language</h3>
                <p className="text-gray-600">
                  Learn guitar in exchange for English lessons
                </p>
              </div>
            </div>

            <div className="border-2 border-primary-200 rounded-lg p-6 hover:border-primary-500 transition-colors">
              <div className="text-center">
                <div className="text-4xl mb-4">🍳</div>
                <h3 className="text-xl font-semibold mb-2">Cooking ↔ Fitness</h3>
                <p className="text-gray-600">
                  Trade culinary skills for personal training
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-primary-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Exchanging Skills?</h2>
          <p className="text-xl mb-8">Join thousands of learners and teachers in our community</p>
          <Link to="/register" className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 inline-block">
            Create Free Account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Home;
