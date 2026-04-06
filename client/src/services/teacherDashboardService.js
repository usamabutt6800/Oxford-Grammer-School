
import api from './api';

export const teacherDashboardService = {
  // Get teacher's own profile
  getMyProfile: async () => {
    try {
      const response = await api.get('/teachers/me');
      return response.data;
    } catch (error) {
      console.error('Error in getMyProfile:', error);
      throw error;
    }
  },

  // Get teacher's assigned classes
  getMyClasses: async () => {
    try {
      const response = await api.get('/teachers/me/classes');
      return response.data;
    } catch (error) {
      console.error('Error in getMyClasses:', error);
      throw error;
    }
  },

  // Get teacher's students
  getMyStudents: async (className, section, search) => {
    try {
      const params = {};
      if (className) params.class = className;
      if (section) params.section = section;
      if (search) params.search = search;

      const response = await api.get('/teachers/me/students', { params });
      return response.data;
    } catch (error) {
      console.error('Error in getMyStudents:', error);
      throw error;
    }
  },

  // Get class attendance
  getClassAttendance: async (date, className, section) => {
    try {
      const response = await api.get('/teachers/me/attendance', {
        params: { date, class: className, section }
      });
      return response.data;
    } catch (error) {
      console.error('Error in getClassAttendance:', error);
      throw error;
    }
  },

  // Mark attendance
  markClassAttendance: async (data) => {
    try {
      const response = await api.post('/teachers/me/attendance', data);
      return response.data;
    } catch (error) {
      console.error('Error in markClassAttendance:', error.response?.data || error);
      throw error;
    }
  },

  // Get dashboard statistics
  getDashboardStats: async () => {
    try {
      const response = await api.get('/teachers/me/stats');
      return response.data;
    } catch (error) {
      console.error('Error in getDashboardStats:', error);
      throw error;
    }
  }
};
