// client/src/services/api.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  // withCredentials removed — we use Bearer tokens in Authorization header,
  // NOT cookies. withCredentials:true causes CORS preflight failures on Vercel.
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — only redirect to login on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// Generic CRUD helpers
export const createEntity = async (endpoint, data) => {
  const response = await api.post(endpoint, data);
  return response.data;
};

export const getEntities = async (endpoint, params = {}) => {
  const response = await api.get(endpoint, { params });
  return response.data;
};

export const getEntity = async (endpoint, id) => {
  const response = await api.get(`${endpoint}/${id}`);
  return response.data;
};

export const updateEntity = async (endpoint, id, data) => {
  const response = await api.put(`${endpoint}/${id}`, data);
  return response.data;
};

export const deleteEntity = async (endpoint, id) => {
  const response = await api.delete(`${endpoint}/${id}`);
  return response.data;
};