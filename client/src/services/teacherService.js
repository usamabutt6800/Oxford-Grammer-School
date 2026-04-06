
import api from './api';

export const teacherService = {
  getTeachers: async (params = {}) => {
    try {
      // Add abort controller to prevent multiple calls
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await api.get('/teachers', { 
        params,
        signal: controller.signal 
      });
      
      clearTimeout(timeoutId);
      return response.data;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Request aborted');
      } else {
        console.error('Error in getTeachers:', error);
      }
      throw error;
    }
  },


  // Get single teacher
  getTeacher: async (id) => {
    try {
      const response = await api.get(`/teachers/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Create new teacher
  createTeacher: async (teacherData) => {
    try {
      // Format the data for backend
      const formattedData = {
        ...teacherData,
        experience: parseInt(teacherData.experience) || 0,
        salary: parseFloat(teacherData.salary) || 0,
        subjects: Array.isArray(teacherData.subjects) ? teacherData.subjects : [],
        assignedClasses: Array.isArray(teacherData.assignedClasses) ? teacherData.assignedClasses : []
      };
      
      const response = await api.post('/teachers', formattedData);
      return response.data;
    } catch (error) {
      console.error('Error in createTeacher:', error.response?.data || error);
      throw error;
    }
  },

  // Update teacher
  updateTeacher: async (id, teacherData) => {
    try {
      const response = await api.put(`/teachers/${id}`, teacherData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Delete teacher
  // Delete teacher
deleteTeacher: async (id) => {
  try {
    const response = await api.delete(`/teachers/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
},

  // Get teacher statistics
  getTeacherStats: async () => {
    try {
      const response = await api.get('/teachers/stats/summary');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get teachers list for dropdown
  getTeachersList: async () => {
    try {
      const response = await api.get('/teachers/list');
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};
