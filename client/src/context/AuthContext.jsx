import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // API base URL
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

  // Initialize axios
  const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor to add token
  api.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Check if user is logged in on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Fetch teacher profile
  const fetchTeacherProfile = async () => {
    try {
      const response = await api.get('/teachers/me');
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch teacher profile:', error);
      return null;
    }
  };

  // Inside checkAuth function in AuthContext.jsx
  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const response = await api.get('/auth/me');
        const userData = response.data.data;
        
        // If user is teacher, fetch additional teacher profile data
        if (userData.role === 'teacher') {
          const teacherProfile = await fetchTeacherProfile();
          setUser({
            ...userData,
            teacherProfile: teacherProfile
          });
        } else {
          setUser(userData);
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setError(null);
      // Use FormData to avoid JSON parsing issues
      const formData = new FormData();
      formData.append('email', email);
      formData.append('password', password);
      
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      if (data.success) {
        const userData = data.data;
        localStorage.setItem('token', userData.token);
        
        // Fetch teacher profile if user is a teacher
        if (userData.role === 'teacher') {
          const teacherProfile = await fetchTeacherProfile();
          setUser({
            ...userData,
            teacherProfile: teacherProfile
          });
        } else {
          setUser(userData);
        }
        
        return { 
          success: true, 
          role: userData.role,
          user: userData 
        };
      } else {
        throw new Error(data.error || 'Login failed');
      }
    } catch (error) {
      const message = error.message || 'Login failed';
      setError(message);
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      await api.get('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
  };

  const updatePassword = async (currentPassword, newPassword) => {
    try {
      await api.put('/auth/updatepassword', {
        currentPassword,
        newPassword
      });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Password update failed';
      return { success: false, error: message };
    }
  };

  // Get API instance for other components to use
  const getApi = () => api;

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    updatePassword,
    checkAuth,
    fetchTeacherProfile, // Export the function for external use
    API_URL,
    api: getApi
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};