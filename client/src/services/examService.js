import api from './api';

export const examService = {
  // Get all exams
  getExams: async (params = {}) => {
    try {
      const response = await api.get('/exams', { params });
      return response.data;
    } catch (error) {
      console.error('Error in getExams:', error);
      throw error;
    }
  },

  // Get single exam
  getExam: async (id) => {
    try {
      const response = await api.get(`/exams/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error in getExam:', error);
      throw error;
    }
  },

  // Create exam
  createExam: async (examData) => {
    try {
      const response = await api.post('/exams', examData);
      return response.data;
    } catch (error) {
      console.error('Error in createExam:', error);
      throw error;
    }
  },

  // Update exam
  updateExam: async (id, examData) => {
    try {
      const response = await api.put(`/exams/${id}`, examData);
      return response.data;
    } catch (error) {
      console.error('Error in updateExam:', error);
      throw error;
    }
  },

  // Delete exam
  deleteExam: async (id) => {
    try {
      const response = await api.delete(`/exams/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error in deleteExam:', error);
      throw error;
    }
  },

  // Get students for exam
  getStudentsForExam: async (examId, params = {}) => {
    try {
      const response = await api.get(`/exams/${examId}/students`, { params });
      return response.data;
    } catch (error) {
      console.error('Error in getStudentsForExam:', error);
      throw error;
    }
  },

  // Submit exam results
  submitExamResults: async (examId, results) => {
    try {
      const response = await api.post(`/exams/${examId}/results`, { results });
      return response.data;
    } catch (error) {
      console.error('Error in submitExamResults:', error);
      throw error;
    }
  },

  // Get exam results
  getExamResults: async (examId, params = {}) => {
    try {
      const response = await api.get(`/exams/${examId}/results`, { params });
      return response.data;
    } catch (error) {
      console.error('Error in getExamResults:', error);
      throw error;
    }
  },

  // Promote students after final exam
  promoteStudents: async (examId) => {
    try {
      const response = await api.post(`/exams/${examId}/promote`);
      return response.data;
    } catch (error) {
      console.error('Error in promoteStudents:', error);
      throw error;
    }
  },

  // Get exam statistics
  getExamStats: async (examId) => {
    try {
      const response = await api.get(`/exams/${examId}/stats`);
      return response.data;
    } catch (error) {
      console.error('Error in getExamStats:', error);
      throw error;
    }
  }
};