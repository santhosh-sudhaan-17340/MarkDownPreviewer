import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FaStar, FaPlus, FaTrash } from 'react-icons/fa';

const SKILL_CATEGORIES = ['Programming', 'Design', 'Music', 'Language', 'Fitness', 'Cooking', 'Business', 'Other'];
const SKILL_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

const Profile = () => {
  const { id } = useParams();
  const { user, updateUser } = useAuth();
  const isOwnProfile = !id || id === user._id;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [showAddSkill, setShowAddSkill] = useState({ offered: false, wanted: false });

  const [newSkillOffered, setNewSkillOffered] = useState({
    name: '',
    category: 'Programming',
    level: 'Intermediate',
    description: '',
    hoursAvailable: 5
  });

  const [newSkillWanted, setNewSkillWanted] = useState({
    name: '',
    category: 'Programming',
    level: 'Intermediate'
  });

  useEffect(() => {
    loadProfile();
  }, [id]);

  const loadProfile = async () => {
    try {
      const userId = id || user._id;
      const res = await axios.get(`/api/users/${userId}`);
      setProfile(res.data.data);
    } catch (error) {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSkillOffered = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/users/skills/offered', newSkillOffered);
      toast.success('Skill added!');
      setShowAddSkill({ ...showAddSkill, offered: false });
      setNewSkillOffered({
        name: '',
        category: 'Programming',
        level: 'Intermediate',
        description: '',
        hoursAvailable: 5
      });
      loadProfile();
    } catch (error) {
      toast.error('Failed to add skill');
    }
  };

  const handleAddSkillWanted = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/users/skills/wanted', newSkillWanted);
      toast.success('Skill added!');
      setShowAddSkill({ ...showAddSkill, wanted: false });
      setNewSkillWanted({
        name: '',
        category: 'Programming',
        level: 'Intermediate'
      });
      loadProfile();
    } catch (error) {
      toast.error('Failed to add skill');
    }
  };

  const handleRemoveSkill = async (type, skillId) => {
    try {
      await axios.delete(`/api/users/skills/${type}/${skillId}`);
      toast.success('Skill removed');
      loadProfile();
    } catch (error) {
      toast.error('Failed to remove skill');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Profile Header */}
      <div className="card mb-8">
        <div className="flex items-start justify-between">
          <div className="flex items-center">
            <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mr-6">
              <span className="text-primary-600 font-bold text-4xl">
                {profile.name.charAt(0)}
              </span>
            </div>
            <div>
              <h1 className="text-3xl font-bold">{profile.name}</h1>
              <p className="text-gray-600 mt-1">{profile.email}</p>
              <div className="flex items-center mt-2">
                <FaStar className="text-yellow-500 mr-1" />
                <span className="font-semibold mr-2">{profile.reputation.rating.toFixed(1)}</span>
                <span className="text-gray-600">({profile.reputation.reviewCount} reviews)</span>
              </div>
              <p className="text-gray-600 mt-2">
                {profile.completedSessions} sessions completed
              </p>
            </div>
          </div>
          {isOwnProfile && (
            <div className="flex items-center space-x-2">
              <span className="text-lg font-semibold text-primary-600">
                {profile.timeCredits} credits
              </span>
            </div>
          )}
        </div>
        {profile.bio && (
          <p className="mt-4 text-gray-700">{profile.bio}</p>
        )}
      </div>

      {/* Skills Offered */}
      <div className="card mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Skills Offered</h2>
          {isOwnProfile && (
            <button
              onClick={() => setShowAddSkill({ ...showAddSkill, offered: !showAddSkill.offered })}
              className="btn btn-primary"
            >
              <FaPlus className="inline mr-2" />
              Add Skill
            </button>
          )}
        </div>

        {showAddSkill.offered && isOwnProfile && (
          <form onSubmit={handleAddSkillOffered} className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Skill name (e.g., React Development)"
                className="input"
                value={newSkillOffered.name}
                onChange={(e) => setNewSkillOffered({ ...newSkillOffered, name: e.target.value })}
                required
              />
              <select
                className="input"
                value={newSkillOffered.category}
                onChange={(e) => setNewSkillOffered({ ...newSkillOffered, category: e.target.value })}
              >
                {SKILL_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              <select
                className="input"
                value={newSkillOffered.level}
                onChange={(e) => setNewSkillOffered({ ...newSkillOffered, level: e.target.value })}
              >
                {SKILL_LEVELS.map(level => <option key={level} value={level}>{level}</option>)}
              </select>
              <input
                type="number"
                placeholder="Hours available"
                className="input"
                value={newSkillOffered.hoursAvailable}
                onChange={(e) => setNewSkillOffered({ ...newSkillOffered, hoursAvailable: Number(e.target.value) })}
                min="1"
              />
            </div>
            <textarea
              placeholder="Description (optional)"
              className="input mt-4"
              rows="2"
              value={newSkillOffered.description}
              onChange={(e) => setNewSkillOffered({ ...newSkillOffered, description: e.target.value })}
            />
            <button type="submit" className="btn btn-primary mt-4">Add Skill</button>
          </form>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          {profile.skillsOffered.map((skill) => (
            <div key={skill._id} className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{skill.name}</h3>
                  <div className="flex gap-2 mt-2">
                    <span className="badge badge-category">{skill.category}</span>
                    <span className="badge badge-skill">{skill.level}</span>
                  </div>
                  {skill.description && (
                    <p className="text-gray-600 text-sm mt-2">{skill.description}</p>
                  )}
                  <p className="text-sm text-gray-500 mt-2">
                    {skill.hoursAvailable} hours available
                  </p>
                </div>
                {isOwnProfile && (
                  <button
                    onClick={() => handleRemoveSkill('offered', skill._id)}
                    className="text-red-500 hover:text-red-700 ml-2"
                  >
                    <FaTrash />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        {profile.skillsOffered.length === 0 && (
          <p className="text-gray-500 text-center py-8">No skills offered yet</p>
        )}
      </div>

      {/* Skills Wanted */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Skills Wanted</h2>
          {isOwnProfile && (
            <button
              onClick={() => setShowAddSkill({ ...showAddSkill, wanted: !showAddSkill.wanted })}
              className="btn btn-primary"
            >
              <FaPlus className="inline mr-2" />
              Add Skill
            </button>
          )}
        </div>

        {showAddSkill.wanted && isOwnProfile && (
          <form onSubmit={handleAddSkillWanted} className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid md:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="Skill name"
                className="input"
                value={newSkillWanted.name}
                onChange={(e) => setNewSkillWanted({ ...newSkillWanted, name: e.target.value })}
                required
              />
              <select
                className="input"
                value={newSkillWanted.category}
                onChange={(e) => setNewSkillWanted({ ...newSkillWanted, category: e.target.value })}
              >
                {SKILL_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              <select
                className="input"
                value={newSkillWanted.level}
                onChange={(e) => setNewSkillWanted({ ...newSkillWanted, level: e.target.value })}
              >
                {SKILL_LEVELS.map(level => <option key={level} value={level}>{level}</option>)}
              </select>
            </div>
            <button type="submit" className="btn btn-primary mt-4">Add Skill</button>
          </form>
        )}

        <div className="grid md:grid-cols-3 gap-4">
          {profile.skillsWanted.map((skill) => (
            <div key={skill._id} className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold">{skill.name}</h3>
                  <div className="flex gap-2 mt-2">
                    <span className="badge badge-category">{skill.category}</span>
                    {skill.level && <span className="badge badge-skill">{skill.level}</span>}
                  </div>
                </div>
                {isOwnProfile && (
                  <button
                    onClick={() => handleRemoveSkill('wanted', skill._id)}
                    className="text-red-500 hover:text-red-700 ml-2"
                  >
                    <FaTrash />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        {profile.skillsWanted.length === 0 && (
          <p className="text-gray-500 text-center py-8">No skills wanted yet</p>
        )}
      </div>
    </div>
  );
};

export default Profile;
