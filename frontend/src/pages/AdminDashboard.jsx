import { useState, useEffect } from 'react';
import { adminAPI } from '../utils/api';
import { FaUsers, FaCheck, FaTrash, FaBan, FaCheckCircle } from 'react-icons/fa';

function AdminDashboard() {
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getUsers({ page: 1, limit: 50 })
      ]);

      setStats(statsRes.data.stats);
      setUsers(usersRes.data.users);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (userId) => {
    try {
      await adminAPI.verifyUser(userId);
      alert('User verified successfully');
      fetchData();
    } catch (error) {
      alert('Failed to verify user');
    }
  };

  const handleActivate = async (userId, active) => {
    try {
      await adminAPI.activateUser(userId, active);
      alert(`User ${active ? 'activated' : 'deactivated'} successfully`);
      fetchData();
    } catch (error) {
      alert(`Failed to ${active ? 'activate' : 'deactivate'} user`);
    }
  };

  const handleDelete = async (userId) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      await adminAPI.deleteUser(userId);
      alert('User deleted successfully');
      fetchData();
    } catch (error) {
      alert('Failed to delete user');
    }
  };

  const filteredUsers = users.filter(user =>
    `${user.firstName} ${user.lastName} ${user.email}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">Manage users and platform statistics</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalUsers || 0}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <FaUsers className="text-blue-600 text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Active Users</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeUsers || 0}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <FaCheckCircle className="text-green-600 text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Verified Users</p>
              <p className="text-2xl font-bold text-gray-900">{stats.verifiedUsers || 0}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <FaCheck className="text-purple-600 text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Interests</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalInterests || 0}</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-full">
              <FaUsers className="text-yellow-600 text-xl" />
            </div>
          </div>
        </div>
      </div>

      {/* User Management */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900 mb-4">User Management</h2>
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field max-w-md"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <img
                          src={user.profilePhoto || '/default-avatar.png'}
                          alt={`${user.firstName} ${user.lastName}`}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{user.gender}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.email}</div>
                      <div className="text-sm text-gray-500">{user.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        {user.verified ? (
                          <span className="inline-flex px-2 text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex px-2 text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            Not Verified
                          </span>
                        )}
                        {user.active ? (
                          <span className="inline-flex px-2 text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex px-2 text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            Inactive
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {!user.verified && (
                        <button
                          onClick={() => handleVerify(user._id)}
                          className="text-green-600 hover:text-green-900"
                          title="Verify user"
                        >
                          <FaCheck />
                        </button>
                      )}
                      <button
                        onClick={() => handleActivate(user._id, !user.active)}
                        className={user.active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}
                        title={user.active ? 'Deactivate' : 'Activate'}
                      >
                        <FaBan />
                      </button>
                      <button
                        onClick={() => handleDelete(user._id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete user"
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
