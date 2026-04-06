import api from './api';

export const attendanceService = {
  // Get attendance by date and class
  getAttendance: async (date, className, section) => {
    try {
      const response = await api.get('/attendance', {
        params: { date, class: className, section }
      });
      return response.data;
    } catch (error) {
      console.error('Error in getAttendance:', error);
      throw error;
    }
  },

  // Mark attendance
  markAttendance: async (data) => {
    try {
      const response = await api.post('/attendance', data);
      return response.data;
    } catch (error) {
      console.error('Error in markAttendance:', error.response?.data || error);
      throw error;
    }
  },

  // Get monthly attendance
  getMonthlyAttendance: async (year, month, className, section) => {
    try {
      const response = await api.get('/attendance/monthly', {
        params: { year, month, class: className, section }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get student attendance
  getStudentAttendance: async (studentId, year, month) => {
    try {
      const response = await api.get(`/attendance/student/${studentId}`, {
        params: { year, month }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get attendance statistics
  getAttendanceStats: async () => {
    try {
      const response = await api.get('/attendance/stats');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get attendance report for date range
  getAttendanceReport: async (startDate, endDate, className, section) => {
    try {
      const response = await api.get('/attendance/report', {
        params: { startDate, endDate, class: className, section }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // ========== ADD THESE NEW FUNCTIONS ==========
  
  // Approve single attendance record
  approveAttendance: async (attendanceId) => {
    try {
      const response = await api.post(`/attendance/${attendanceId}/approve`);
      return response.data;
    } catch (error) {
      console.error('Error in approveAttendance:', error);
      throw error;
    }
  },

  // Reject single attendance record
  rejectAttendance: async (attendanceId, reason) => {
    try {
      const response = await api.post(`/attendance/${attendanceId}/reject`, { reason });
      return response.data;
    } catch (error) {
      console.error('Error in rejectAttendance:', error);
      throw error;
    }
  },

  // Bulk approve attendance
  bulkApproveAttendance: async (date, className, section) => {
    try {
      const response = await api.post('/attendance/bulk-approve', {
        date,
        class: className,
        section
      });
      return response.data;
    } catch (error) {
      console.error('Error in bulkApproveAttendance:', error);
      throw error;
    }
  },

  // ========== END NEW FUNCTIONS ==========

  // Holiday management
  getHolidays: async (year, type) => {
    try {
      const response = await api.get('/holidays', {
        params: { year, type }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  createHoliday: async (holidayData) => {
    try {
      const response = await api.post('/holidays', holidayData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateHoliday: async (id, holidayData) => {
    try {
      const response = await api.put(`/holidays/${id}`, holidayData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deleteHoliday: async (id) => {
    try {
      const response = await api.delete(`/holidays/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getHolidayCalendar: async (year) => {
    try {
      const response = await api.get(`/holidays/calendar/${year}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};