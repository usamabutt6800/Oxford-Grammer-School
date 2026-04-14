import api from './api';

export const studentService = {
  // Get all students
  getStudents: async (params = {}) => {
    try {
      const response = await api.get('/students', { params });
      return response.data;
    } catch (error) {
      console.error('Error in getStudents:', error);
      throw error;
    }
  },

  // Get single student
  getStudent: async (id) => {
    try {
      const response = await api.get(`/students/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error in getStudent:', error);
      throw error;
    }
  },

  // Create new student
  createStudent: async (studentData) => {
    try {
      const response = await api.post('/students', studentData);
      return response.data;
    } catch (error) {
      console.error('Error in createStudent:', error.response?.data || error);
      throw error;
    }
  },

  // Update student
  updateStudent: async (id, studentData) => {
    try {
      const response = await api.put(`/students/${id}`, studentData);
      return response.data;
    } catch (error) {
      console.error('Error in updateStudent:', error.response?.data || error);
      throw error;
    }
  },

  // Delete student
  deleteStudent: async (id) => {
    try {
      const response = await api.delete(`/students/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error in deleteStudent:', error);
      throw error;
    }
  },

  // Get student statistics
  getStudentStats: async () => {
    try {
      const response = await api.get('/students/stats/summary');
      return response.data;
    } catch (error) {
      console.error('Error in getStudentStats:', error);
      throw error;
    }
  }
};