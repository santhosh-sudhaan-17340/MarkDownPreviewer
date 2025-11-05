import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      const { state } = JSON.parse(authStorage);
      if (state.token) {
        config.headers.Authorization = `Bearer ${state.token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  changePassword: (data) => api.put('/auth/change-password', data),
};

// Profile APIs
export const profileAPI = {
  search: (params) => api.get('/profiles/search', { params }),
  getRecommendations: () => api.get('/profiles/recommendations'),
  getProfile: (id) => api.get(`/profiles/${id}`),
  updateProfile: (data) => api.put('/profiles/me', data),
  uploadPhoto: (formData) => api.post('/profiles/upload-photo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  deletePhoto: (photoUrl) => api.delete('/profiles/photo', { data: { photoUrl } }),
};

// Interest APIs
export const interestAPI = {
  send: (data) => api.post('/interests/send', data),
  getSent: () => api.get('/interests/sent'),
  getReceived: () => api.get('/interests/received'),
  getAccepted: () => api.get('/interests/accepted'),
  accept: (id, message) => api.put(`/interests/${id}/accept`, { message }),
  reject: (id, message) => api.put(`/interests/${id}/reject`, { message }),
  cancel: (id) => api.delete(`/interests/${id}`),
};

// Favorite APIs
export const favoriteAPI = {
  add: (data) => api.post('/favorites', data),
  getAll: () => api.get('/favorites'),
  update: (id, notes) => api.put(`/favorites/${id}`, { notes }),
  remove: (id) => api.delete(`/favorites/${id}`),
};

// Admin APIs
export const adminAPI = {
  getUsers: (params) => api.get('/admin/users', { params }),
  verifyUser: (id) => api.put(`/admin/users/${id}/verify`),
  activateUser: (id, active) => api.put(`/admin/users/${id}/activate`, { active }),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getStats: () => api.get('/admin/stats'),
};

export default api;
