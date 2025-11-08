import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getCurrentUser: () => api.get('/auth/me'),
};

// Tickets API
export const ticketsAPI = {
  getAll: (params) => api.get('/tickets', { params }),
  getById: (id) => api.get(`/tickets/${id}`),
  create: (data) => api.post('/tickets', data),
  update: (id, data) => api.put(`/tickets/${id}`, data),
  updateStatus: (id, data) => api.patch(`/tickets/${id}/status`, data),
  assign: (id, data) => api.post(`/tickets/${id}/assign`, data),
  escalate: (id, data) => api.post(`/tickets/${id}/escalate`, data),
  addComment: (id, data) => api.post(`/tickets/${id}/comments`, data),
  getTimeline: (id) => api.get(`/tickets/${id}/timeline`),
};

// Analytics API
export const analyticsAPI = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getBacklog: () => api.get('/analytics/backlog'),
  getSlaBreaches: () => api.get('/analytics/sla-breaches'),
  getAgentProductivity: () => api.get('/analytics/agent-productivity'),
  getTrends: (days) => api.get('/analytics/trends', { params: { days } }),
};

export default api;
