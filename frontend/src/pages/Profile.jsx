import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { profileAPI, interestAPI, favoriteAPI } from '../utils/api';
import { FaMapMarkerAlt, FaBriefcase, FaGraduationCap, FaHeart, FaPaperPlane, FaPhone, FaEnvelope } from 'react-icons/fa';

function Profile() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, [id]);

  const fetchProfile = async () => {
    try {
      const response = await profileAPI.getProfile(id);
      setProfile(response.data.profile);
    } catch (error) {
      console.error('Error fetching profile:', error);
      alert('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSendInterest = async () => {
    try {
      const message = prompt('Enter a message (optional):');
      await interestAPI.send({ receiverId: id, message });
      alert('Interest sent successfully!');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to send interest');
    }
  };

  const handleAddFavorite = async () => {
    try {
      await favoriteAPI.add({ profileId: id });
      alert('Added to favorites!');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to add to favorites');
    }
  };

  const getAge = (dob) => {
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-center">Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-center">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow-lg p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row gap-8 mb-8">
          <div className="flex-shrink-0">
            <img
              src={profile.profilePhoto || '/default-avatar.png'}
              alt={`${profile.firstName} ${profile.lastName}`}
              className="w-64 h-64 object-cover rounded-lg shadow-md"
            />
          </div>

          <div className="flex-1">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {profile.firstName} {profile.lastName}
                </h1>
                {profile.verified && (
                  <span className="inline-block bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full mt-2">
                    ✓ Verified Profile
                  </span>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 text-gray-700">
              <div>
                <p><strong>Age:</strong> {getAge(profile.dateOfBirth)} years</p>
                <p><strong>Height:</strong> {profile.height} cm</p>
                <p><strong>Marital Status:</strong> {profile.maritalStatus}</p>
                <p><strong>Gender:</strong> {profile.gender}</p>
              </div>
              <div>
                <p><strong>Gotra:</strong> {profile.gotra}</p>
                {profile.kuldevta && <p><strong>Kuldevta:</strong> {profile.kuldevta}</p>}
                {profile.manglik && <p><strong>Manglik:</strong> {profile.manglik}</p>}
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleSendInterest}
                className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold"
              >
                <FaPaperPlane /> Send Interest
              </button>
              <button
                onClick={handleAddFavorite}
                className="flex items-center gap-2 px-6 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 font-semibold"
              >
                <FaHeart /> Add to Favorites
              </button>
            </div>
          </div>
        </div>

        {/* Details Sections */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Education & Career */}
          <div>
            <h2 className="text-xl font-bold mb-4 text-gray-900 border-b pb-2">
              Education & Career
            </h2>
            <div className="space-y-2 text-gray-700">
              <p><strong>Education:</strong> {profile.education}</p>
              {profile.educationDetails && <p className="text-sm text-gray-600">{profile.educationDetails}</p>}
              <p><strong>Occupation:</strong> {profile.occupation}</p>
              {profile.occupationDetails && <p className="text-sm text-gray-600">{profile.occupationDetails}</p>}
              {profile.annualIncome && <p><strong>Annual Income:</strong> {profile.annualIncome}</p>}
            </div>
          </div>

          {/* Family Details */}
          <div>
            <h2 className="text-xl font-bold mb-4 text-gray-900 border-b pb-2">
              Family Details
            </h2>
            <div className="space-y-2 text-gray-700">
              {profile.fatherName && <p><strong>Father:</strong> {profile.fatherName}</p>}
              {profile.fatherOccupation && <p className="text-sm text-gray-600">{profile.fatherOccupation}</p>}
              {profile.motherName && <p><strong>Mother:</strong> {profile.motherName}</p>}
              {profile.familyType && <p><strong>Family Type:</strong> {profile.familyType}</p>}
              {profile.familyValues && <p><strong>Family Values:</strong> {profile.familyValues}</p>}
              {profile.brothers && (
                <p><strong>Brothers:</strong> {profile.brothers.total} ({profile.brothers.married} married)</p>
              )}
              {profile.sisters && (
                <p><strong>Sisters:</strong> {profile.sisters.total} ({profile.sisters.married} married)</p>
              )}
            </div>
          </div>

          {/* Location */}
          {profile.address && (
            <div>
              <h2 className="text-xl font-bold mb-4 text-gray-900 border-b pb-2">
                Location
              </h2>
              <div className="space-y-2 text-gray-700">
                {profile.address.city && <p><strong>City:</strong> {profile.address.city}</p>}
                {profile.address.state && <p><strong>State:</strong> {profile.address.state}</p>}
                {profile.address.country && <p><strong>Country:</strong> {profile.address.country}</p>}
              </div>
            </div>
          )}

          {/* Lifestyle */}
          <div>
            <h2 className="text-xl font-bold mb-4 text-gray-900 border-b pb-2">
              Lifestyle
            </h2>
            <div className="space-y-2 text-gray-700">
              {profile.diet && <p><strong>Diet:</strong> {profile.diet}</p>}
              {profile.smoking && <p><strong>Smoking:</strong> {profile.smoking}</p>}
              {profile.drinking && <p><strong>Drinking:</strong> {profile.drinking}</p>}
              {profile.complexion && <p><strong>Complexion:</strong> {profile.complexion}</p>}
              {profile.bloodGroup && <p><strong>Blood Group:</strong> {profile.bloodGroup}</p>}
            </div>
          </div>
        </div>

        {/* About Me */}
        {profile.aboutMe && (
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4 text-gray-900 border-b pb-2">
              About Me
            </h2>
            <p className="text-gray-700 whitespace-pre-line">{profile.aboutMe}</p>
          </div>
        )}

        {/* Hobbies */}
        {profile.hobbies && profile.hobbies.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4 text-gray-900 border-b pb-2">
              Hobbies & Interests
            </h2>
            <div className="flex flex-wrap gap-2">
              {profile.hobbies.map((hobby, index) => (
                <span key={index} className="bg-gray-200 px-3 py-1 rounded-full text-sm">
                  {hobby}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Contact Information (if privacy allows) */}
        {(profile.phone || profile.email) && (
          <div className="mt-8 bg-gray-50 p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4 text-gray-900">
              Contact Information
            </h2>
            <div className="space-y-2 text-gray-700">
              {profile.phone && (
                <p className="flex items-center gap-2">
                  <FaPhone className="text-primary-600" />
                  {profile.phone}
                </p>
              )}
              {profile.email && (
                <p className="flex items-center gap-2">
                  <FaEnvelope className="text-primary-600" />
                  {profile.email}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Profile;
