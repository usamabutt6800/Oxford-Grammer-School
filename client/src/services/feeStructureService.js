
import api from './api';

export const feeStructureService = {
  // Get all fee structures
  getFeeStructures: async () => {
    try {
      const response = await api.get('/fee-structure');
      return response.data;
    } catch (error) {
      console.error('Error in getFeeStructures:', error);
      throw error;
    }
  },

  // Get fee structure by class
  getFeeStructureByClass: async (className) => {
    try {
      const response = await api.get(`/fee-structure/${className}`);
      return response.data;
    } catch (error) {
      console.error('Error in getFeeStructureByClass:', error);
      throw error;
    }
  },

  // Get all classes with fees
  getAllClassesWithFees: async () => {
    try {
      const response = await api.get('/fee-structure/all/classes');
      return response.data;
    } catch (error) {
      console.error('Error in getAllClassesWithFees:', error);
      throw error;
    }
  },

  // Create or update fee structure
  createOrUpdateFeeStructure: async (feeData) => {
    try {
      const response = await api.post('/fee-structure', feeData);
      return response.data;
    } catch (error) {
      console.error('Error in createOrUpdateFeeStructure:', error);
      throw error;
    }
  },

  // Delete fee structure
  deleteFeeStructure: async (className) => {
    try {
      const response = await api.delete(`/fee-structure/${className}`);
      return response.data;
    } catch (error) {
      console.error('Error in deleteFeeStructure:', error);
      throw error;
    }
  }
};
