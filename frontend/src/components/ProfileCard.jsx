import { useNavigate } from 'react-router-dom';
import { FaMapMarkerAlt, FaBriefcase, FaGraduationCap, FaHeart, FaPaperPlane } from 'react-icons/fa';

function ProfileCard({ profile, onSendInterest, onAddFavorite, compact = false }) {
  const navigate = useNavigate();

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

  return (
    <div className="card hover:shadow-xl transition-shadow cursor-pointer">
      <div onClick={() => navigate(`/profile/${profile._id || profile.id}`)} className="flex flex-col md:flex-row gap-4">
        <div className="flex-shrink-0">
          <img
            src={profile.profilePhoto || '/default-avatar.png'}
            alt={`${profile.firstName} ${profile.lastName}`}
            className="w-full md:w-32 h-48 md:h-32 object-cover rounded-lg"
          />
        </div>

        <div className="flex-1">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {profile.firstName} {profile.lastName}
              </h3>
              <p className="text-gray-600 text-sm">
                {getAge(profile.dateOfBirth)} years | {profile.height} cm | {profile.maritalStatus}
              </p>
            </div>
            {profile.verified && (
              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                ✓ Verified
              </span>
            )}
          </div>

          {!compact && (
            <div className="mt-3 space-y-1 text-sm text-gray-700">
              <p className="flex items-center">
                <FaGraduationCap className="mr-2 text-primary-600" />
                {profile.education}
              </p>
              <p className="flex items-center">
                <FaBriefcase className="mr-2 text-primary-600" />
                {profile.occupation}
              </p>
              {profile.address?.city && (
                <p className="flex items-center">
                  <FaMapMarkerAlt className="mr-2 text-primary-600" />
                  {profile.address.city}, {profile.address.state}
                </p>
              )}
              {profile.gotra && (
                <p className="text-gray-600">
                  <strong>Gotra:</strong> {profile.gotra}
                </p>
              )}
            </div>
          )}

          {!compact && (onSendInterest || onAddFavorite) && (
            <div className="mt-4 flex gap-2">
              {onSendInterest && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSendInterest(profile._id || profile.id);
                  }}
                  className="flex items-center gap-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  <FaPaperPlane /> Send Interest
                </button>
              )}
              {onAddFavorite && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddFavorite(profile._id || profile.id);
                  }}
                  className="flex items-center gap-1 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
                >
                  <FaHeart /> Add to Favorites
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfileCard;
