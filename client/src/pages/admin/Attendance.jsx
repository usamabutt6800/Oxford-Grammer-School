import React, { useState, useEffect } from 'react';
import { 
  FaCalendarAlt, FaSearch, FaFilter, FaEdit, FaSave, 
  FaPrint, FaDownload, FaEye, FaUsers, FaUserCheck, FaUserTimes,
  FaCalendarDay, FaChartBar, FaSpinner, FaArrowLeft, FaArrowRight,
  FaCalendarPlus, FaCalendarCheck, FaCalendarTimes, FaSun,
  FaClock, FaCheckCircle, FaTimesCircle, FaFileAlt, FaExclamationTriangle
} from 'react-icons/fa';
import { format, addDays, subDays, isToday, isSunday, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { attendanceService } from '../../services/attendanceService';
// Import professional report generators
import { generateDetailedReport, generateSummaryReport, generateDefaultersReport } from '../../utils/professionalReportGenerator';

const AdminAttendance = () => {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedClass, setSelectedClass] = useState('10');
  const [selectedSection, setSelectedSection] = useState('A');
  const [attendanceData, setAttendanceData] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('daily');
  const [monthlyData, setMonthlyData] = useState(null);
  const [holidayModal, setHolidayModal] = useState(false);
  const [rejectModal, setRejectModal] = useState(null); // Added for rejection
  const [rejectReason, setRejectReason] = useState(''); // Added for rejection reason
  
  // New state variables for report generation
  const [reportModal, setReportModal] = useState(false);
  const [reportStartDate, setReportStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [reportEndDate, setReportEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [reportClass, setReportClass] = useState('10');
  const [reportSection, setReportSection] = useState('A');
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportType, setReportType] = useState('detailed'); // 'detailed', 'summary', 'defaulters'

  const [newHoliday, setNewHoliday] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    title: '',
    description: '',
    type: 'School Holiday'
  });

  // Available classes and sections
  const classes = ['Play Group', 'Nursery', 'Prep', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
  const sections = ['A', 'B', 'C', 'D'];
  const statusOptions = ['Present', 'Absent', 'Leave'];
  const holidayTypes = ['Public Holiday', 'School Holiday', 'Exam Holiday', 'Special Event'];

  // Fetch attendance data when date, class, or section changes
  useEffect(() => {
    if (selectedDate && selectedClass && selectedSection) {
      fetchAttendanceData();
    }
  }, [selectedDate, selectedClass, selectedSection]);

  // Fetch monthly data when view mode changes
  useEffect(() => {
    if (viewMode === 'monthly' && selectedClass && selectedSection) {
      fetchMonthlyData();
    }
  }, [viewMode, selectedClass, selectedSection]);

  // Add debug logging for pending attendance
  // Add this useEffect to debug pending attendance
useEffect(() => {
  if (attendanceData?.pendingAttendance && attendanceData.pendingAttendance.length > 0) {
    console.log('=== PENDING ATTENDANCE DEBUG ===');
    console.log('Number of pending:', attendanceData.pendingCount);
    console.log('First pending record:', attendanceData.pendingAttendance[0]);
    
    // Check all possible paths for class and section
    const firstRecord = attendanceData.pendingAttendance[0];
    console.log('Has student object?', !!firstRecord.student);
    
    if (firstRecord.student) {
      console.log('Student object:', firstRecord.student);
      console.log('Student class:', firstRecord.student.class);
      console.log('Student section:', firstRecord.student.section);
    }
    
    console.log('Record class property:', firstRecord.class);
    console.log('Record section property:', firstRecord.section);
    console.log('Selected date:', selectedDate);
    console.log('Selected class:', selectedClass);
    console.log('Selected section:', selectedSection);
  }
}, [attendanceData]);

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      const response = await attendanceService.getAttendance(
        selectedDate,
        selectedClass,
        selectedSection
      );

      if (response.success) {
        setAttendanceData(response.data);
        
        // Check if it's a holiday or Sunday
        if (response.data.isSunday || response.data.holiday) {
          // For holidays/Sundays, set empty attendance records
          setAttendanceRecords([]);
          setIsEditing(false);
          
          // Ensure summary exists even for holidays
          if (!response.data.summary) {
            setAttendanceData(prev => ({
              ...prev,
              summary: { total: 0, present: 0, absent: 0, leave: 0, percentage: 0 }
            }));
          }
        } else {
          // Transform students data for the table (NORMAL DAYS)
          const records = response.data.students.map(student => ({
            _id: student.student._id,
            studentId: student.student.admissionNo,
            name: student.student.name,
            rollNo: student.student.rollNo,
            fatherName: student.student.fatherName,
            status: student.status,
            remarks: student.remarks || '',
            markedBy: student.markedBy,
            updatedAt: student.updatedAt
          }));
          
          setAttendanceRecords(records);
        }
        
        // If it's Sunday or holiday, disable editing (already done above)
        if (response.data.isSunday || response.data.holiday) {
          setIsEditing(false);
        }
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
      toast.error(error.response?.data?.error || 'Failed to fetch attendance data');
      setAttendanceData(null);
      setAttendanceRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyData = async () => {
    try {
      const currentDate = new Date(selectedDate);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      const response = await attendanceService.getMonthlyAttendance(
        year,
        month,
        selectedClass,
        selectedSection
      );

      if (response.success) {
        setMonthlyData(response.data);
      }
    } catch (error) {
      console.error('Error fetching monthly data:', error);
      toast.error('Failed to fetch monthly attendance data');
    }
  };

  const handleDateChange = (direction) => {
    const currentDate = new Date(selectedDate);
    const newDate = direction === 'next' ? addDays(currentDate, 1) : subDays(currentDate, 1);
    setSelectedDate(format(newDate, 'yyyy-MM-dd'));
  };

  const handleStatusChange = (studentId, newStatus) => {
    if (!isEditing || attendanceData?.isSunday || attendanceData?.holiday) {
      toast.error('Cannot modify attendance for this date');
      return;
    }
    
    setAttendanceRecords(prev => prev.map(record => 
      record._id === studentId ? { ...record, status: newStatus } : record
    ));
  };

  const handleSaveAttendance = async () => {
    if (!isEditing || attendanceData?.isSunday || attendanceData?.holiday) {
      return;
    }

    try {
      setSaving(true);
      
      // Prepare data for API
      const attendanceRecordsToSave = attendanceRecords.map(record => ({
        studentId: record._id, // This should be student ID
        status: record.status,
        remarks: record.remarks
      }));

      console.log('Sending data to server:', {
        date: selectedDate,
        students: attendanceRecordsToSave
      });

      const response = await attendanceService.markAttendance({
        date: selectedDate,
        students: attendanceRecordsToSave
      });

      console.log('Server response:', response);

      if (response.success) {
        if (response.data.failed > 0) {
          // Show detailed error
          toast.error(`Failed to save ${response.data.failed} records. Errors: ${response.data.errors.join(', ')}`);
        } else {
          toast.success(response.message || 'Attendance saved successfully!');
        }
        setIsEditing(false);
        fetchAttendanceData(); // Refresh data
      } else {
        toast.error(response.error || 'Failed to save attendance');
      }
    } catch (error) {
      console.error('Error saving attendance:', error);
      console.error('Error response data:', error.response?.data);
      toast.error(error.response?.data?.error || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkAction = (action) => {
    if (!isEditing || attendanceData?.isSunday || attendanceData?.holiday) {
      toast.error('Cannot modify attendance for this date');
      return;
    }

    setAttendanceRecords(prev => prev.map(record => ({ 
      ...record, 
      status: action,
      remarks: action === 'Leave' ? 'Bulk marked as leave' : ''
    })));
    toast.success(`All students marked as ${action}`);
  };

  // Add these functions to handle approval/rejection
  const handleApproveAttendance = async (attendanceId) => {
    try {
      const response = await attendanceService.approveAttendance(attendanceId);
      if (response.success) {
        toast.success('Attendance approved successfully');
        fetchAttendanceData(); // Refresh data
      }
    } catch (error) {
      toast.error('Failed to approve attendance');
    }
  };

  const handleRejectAttendance = async (attendanceId, reason) => {
    try {
      const response = await attendanceService.rejectAttendance(attendanceId, reason);
      if (response.success) {
        toast.success('Attendance rejected');
        fetchAttendanceData();
        setRejectModal(null);
        setRejectReason('');
      }
    } catch (error) {
      toast.error('Failed to reject attendance');
    }
  };

  // UPDATED: handleBulkApprove function
  const handleBulkApprove = async () => {
  // Check if there are pending attendance records
  if (!attendanceData?.pendingAttendance || attendanceData.pendingAttendance.length === 0) {
    toast.error('No pending attendance to approve');
    return;
  }

  // First, log the exact structure for debugging
  console.log('=== DEBUG: First pending record structure ===');
  const firstRecord = attendanceData.pendingAttendance[0];
  console.log('Full record:', firstRecord);
  console.log('All keys:', Object.keys(firstRecord));
  
  // Try to find class and section in different possible locations
  let pendingClass = selectedClass; // fallback to selected
  let pendingSection = selectedSection; // fallback to selected
  
  // Check multiple possible locations for class and section
  if (firstRecord.student && firstRecord.student.class) {
    pendingClass = firstRecord.student.class;
    console.log('Found class in student.class:', pendingClass);
  } else if (firstRecord.class) {
    pendingClass = firstRecord.class;
    console.log('Found class in record.class:', pendingClass);
  }
  
  if (firstRecord.student && firstRecord.student.section) {
    pendingSection = firstRecord.student.section;
    console.log('Found section in student.section:', pendingSection);
  } else if (firstRecord.section) {
    pendingSection = firstRecord.section;
    console.log('Found section in record.section:', pendingSection);
  }

  // Use the selected date since pending records might not have date in correct format
  const dateToUse = selectedDate;

  console.log('Bulk approving with:', {
    date: dateToUse,
    class: pendingClass,
    section: pendingSection,
    pendingCount: attendanceData.pendingAttendance.length
  });

  try {
    toast.loading('Approving attendance...', { id: 'bulk-approve' });
    
    // Check if function exists
    if (!attendanceService.bulkApproveAttendance) {
      toast.dismiss('bulk-approve');
      toast.error('Bulk approve function not available');
      console.error('attendanceService.bulkApproveAttendance is not a function');
      return;
    }
    
    const response = await attendanceService.bulkApproveAttendance(
      dateToUse,
      pendingClass,
      pendingSection
    );

    if (response.success) {
      toast.dismiss('bulk-approve');
      toast.success(`Approved ${response.data.approvedCount || attendanceData.pendingAttendance.length} attendance records`);
      fetchAttendanceData(); // Refresh
    } else {
      toast.dismiss('bulk-approve');
      toast.error(response.error || 'Failed to approve attendance');
    }
  } catch (error) {
    toast.dismiss('bulk-approve');
    console.error('Bulk approval error:', error);
    
    // Show more detailed error
    if (error.response?.data?.error) {
      toast.error(`Bulk approve failed: ${error.response.data.error}`);
    } else {
      toast.error('Failed to bulk approve attendance');
    }
  }
};

  // Updated function to handle report generation
  const handleGenerateReport = async () => {
  if (!reportStartDate || !reportEndDate) {
    toast.error('Please select start and end dates');
    return;
  }

  if (new Date(reportStartDate) > new Date(reportEndDate)) {
    toast.error('Start date cannot be after end date');
    return;
  }

  try {
    setGeneratingReport(true);
    toast.loading('Generating report...', { id: 'report-gen' });
    
    // Get attendance data for the date range
    const response = await attendanceService.getAttendanceReport(
      reportStartDate,
      reportEndDate,
      reportClass,
      reportSection
    );

    if (response.success) {
      toast.dismiss('report-gen');
      
      // Add holidays data to the report
      const holidaysResponse = await attendanceService.getHolidays(
        new Date(reportStartDate).getFullYear()
      );
      
      const reportDataWithHolidays = {
        ...response.data,
        holidays: holidaysResponse.success ? holidaysResponse.data : []
      };
      
      // Generate the report based on type
      switch (reportType) {
        case 'detailed':
          generateDetailedReport(reportDataWithHolidays);
          break;
        case 'summary':
          generateSummaryReport(reportDataWithHolidays);
          break;
        case 'defaulters':
          generateDefaultersReport(reportDataWithHolidays);
          break;
        default:
          generateDetailedReport(reportDataWithHolidays);
      }
      
      setReportModal(false);
    }
  } catch (error) {
    toast.dismiss('report-gen');
    console.error('Error generating report:', error);
    toast.error(error.response?.data?.error || 'Failed to generate report');
  } finally {
    setGeneratingReport(false);
  }
};

  // Remove old helper functions for report generation since we're using professionalReportGenerator
  // const generateDetailedReport = async (data) => { ... }
  // const generateSummaryReport = async (data) => { ... }
  // const generateDefaultersReport = async (data) => { ... }

  const handleAddHoliday = async () => {
    try {
      const response = await attendanceService.createHoliday(newHoliday);
      if (response.success) {
        toast.success('Holiday added successfully!');
        setHolidayModal(false);
        setNewHoliday({
          date: format(new Date(), 'yyyy-MM-dd'),
          title: '',
          description: '',
          type: 'School Holiday'
        });
        
        // Refresh attendance data if the holiday is for current date
        if (format(new Date(newHoliday.date), 'yyyy-MM-dd') === selectedDate) {
          fetchAttendanceData();
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to add holiday');
    }
  };

  const getAttendanceSummary = () => {
    if (!attendanceData) {
      return { total: 0, present: 0, absent: 0, leave: 0, percentage: 0 };
    }
    
    // For holidays/Sundays, return empty summary
    if (attendanceData.isSunday || attendanceData.holiday) {
      return { total: 0, present: 0, absent: 0, leave: 0, percentage: 0 };
    }
    
    return attendanceData.summary;
  };

  const getFilteredRecords = () => {
    return attendanceRecords.filter(record =>
      record.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.rollNo.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const handleExport = (type = 'daily') => {
    if (!attendanceData) {
      toast.error('No attendance data to export');
      return;
    }

    if (type === 'daily') {
      // Import the export function
      import('../../utils/attendanceExportUtils').then(module => {
        module.exportDailyAttendancePDF(attendanceData, 'Daily Attendance Report');
        toast.success('Daily report exported successfully');
      });
    } else if (type === 'monthly' && monthlyData) {
      import('../../utils/attendanceExportUtils').then(module => {
        module.exportMonthlyAttendancePDF(monthlyData, 'Monthly Attendance Report');
        toast.success('Monthly report exported successfully');
      });
    }
  };

  const handlePrint = () => {
    if (!attendanceData) {
      toast.error('No attendance data to print');
      return;
    }

    import('../../utils/attendanceExportUtils').then(module => {
      module.printAttendance(attendanceData, 'daily');
    });
  };

  const summary = getAttendanceSummary();

  if (loading && !attendanceData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <FaSpinner className="animate-spin text-4xl text-school-blue" />
        <span className="ml-3 text-lg">Loading attendance data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Attendance Management</h1>
          <p className="text-gray-600">Mark and manage student attendance records</p>
        </div>
        <div className="flex space-x-3 mt-4 md:mt-0">
          <div className="relative group">
            <button 
              className="btn-secondary flex items-center"
              onClick={() => handleExport('daily')}
              disabled={!attendanceData}
            >
              <FaDownload className="mr-2" />
              Export
            </button>
            <div className="absolute hidden group-hover:block bg-white shadow-lg rounded-lg mt-1 w-40 z-10">
              <button 
                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                onClick={() => handleExport('daily')}
                disabled={!attendanceData}
              >
                Export Daily Report
              </button>
              <button 
                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                onClick={() => handleExport('monthly')}
                disabled={!monthlyData}
              >
                Export Monthly Report
              </button>
            </div>
          </div>
          <button 
            className="btn-secondary flex items-center"
            onClick={handlePrint}
            disabled={!attendanceData}
          >
            <FaPrint className="mr-2" />
            Print
          </button>
          <button 
            className="btn-secondary flex items-center"
            onClick={() => setReportModal(true)}
          >
            <FaFileAlt className="mr-2" />
            Generate Report
          </button>
          <button 
            className="btn-secondary flex items-center"
            onClick={() => setHolidayModal(true)}
          >
            <FaCalendarPlus className="mr-2" />
            Add Holiday
          </button>
          <button 
            className={`flex items-center px-4 py-2 rounded-lg ${isEditing ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
            onClick={() => isEditing ? handleSaveAttendance() : setIsEditing(true)}
            disabled={saving || attendanceData?.isSunday || attendanceData?.holiday}
          >
            {saving ? (
              <>
                <FaSpinner className="animate-spin mr-2" />
                Saving...
              </>
            ) : isEditing ? (
              <>
                <FaSave className="mr-2" />
                Save Attendance
              </>
            ) : (
              <>
                <FaEdit className="mr-2" />
                Edit Attendance
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-bold text-blue-600">{summary.total}</div>
          <div className="text-sm text-gray-600">Total Students</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-600">{summary.present}</div>
          <div className="text-sm text-gray-600">Present</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-red-600">{summary.absent}</div>
          <div className="text-sm text-gray-600">Absent</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-purple-600">{summary.leave}</div>
          <div className="text-sm text-gray-600">Leave</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-indigo-600">{summary.percentage}%</div>
          <div className="text-sm text-gray-600">Attendance %</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-yellow-600">
            {attendanceData?.isSunday ? 'Sunday' : attendanceData?.holiday ? 'Holiday' : 'Working Day'}
          </div>
          <div className="text-sm text-gray-600">Day Type</div>
        </div>
      </div>

      {/* Controls */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Date Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FaCalendarDay className="inline mr-2" />
              Select Date
            </label>
            <div className="flex items-center">
              <button 
                onClick={() => handleDateChange('prev')}
                className="p-2 border border-gray-300 rounded-l-lg hover:bg-gray-100"
              >
                ←
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="input-field rounded-none text-center"
              />
              <button 
                onClick={() => handleDateChange('next')}
                className="p-2 border border-gray-300 rounded-r-lg hover:bg-gray-100"
              >
                →
              </button>
            </div>
            <div className="mt-1 text-sm text-gray-500">
              {format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')}
              {isToday(new Date(selectedDate)) && ' (Today)'}
              {isSunday(new Date(selectedDate)) && ' (Sunday)'}
            </div>
          </div>

          {/* Class Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FaUsers className="inline mr-2" />
              Select Class
            </label>
            <select
              className="input-field"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              {classes.map(cls => (
                <option key={cls} value={cls}>
                  {cls === 'Play Group' || cls === 'Nursery' || cls === 'Prep' ? cls : `Class ${cls}`}
                </option>
              ))}
            </select>
          </div>

          {/* Section Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FaUsers className="inline mr-2" />
              Select Section
            </label>
            <select
              className="input-field"
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
            >
              {sections.map(sec => (
                <option key={sec} value={sec}>Section {sec}</option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FaSearch className="inline mr-2" />
              Search Students
            </label>
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or roll no..."
                className="input-field pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Bulk Actions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FaUserCheck className="inline mr-2" />
              Bulk Actions
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleBulkAction('Present')}
                disabled={!isEditing || attendanceData?.isSunday || attendanceData?.holiday}
                className={`p-2 text-sm rounded-lg ${isEditing ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-400'}`}
              >
                All Present
              </button>
              <button
                onClick={() => handleBulkAction('Absent')}
                disabled={!isEditing || attendanceData?.isSunday || attendanceData?.holiday}
                className={`p-2 text-sm rounded-lg ${isEditing ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-gray-100 text-gray-400'}`}
              >
                All Absent
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Special Day Notice */}
      {(attendanceData?.isSunday || attendanceData?.holiday) && (
        <div className={`p-4 rounded-lg ${attendanceData.isSunday ? 'bg-blue-50 border border-blue-200' : 'bg-yellow-50 border border-yellow-200'}`}>
          <div className="flex items-center">
            {attendanceData.isSunday ? (
              <FaSun className="mr-3 text-blue-600" />
            ) : (
              <FaCalendarCheck className="mr-3 text-yellow-600" />
            )}
            <div>
              <h3 className="font-semibold">
                {attendanceData.isSunday ? 'Sunday - No School' : `Holiday: ${attendanceData.holiday}`}
              </h3>
              <p className="text-sm text-gray-600">
                {attendanceData.isSunday 
                  ? 'Attendance cannot be marked on Sundays.' 
                  : 'Attendance cannot be marked on holidays.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Table */}
      <div className="card">
        <div className="mb-4 flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-800">
            {attendanceData?.isSunday || attendanceData?.holiday 
              ? `${attendanceData.isSunday ? 'Sunday' : 'Holiday'} - No Attendance` 
              : `Attendance for Class ${selectedClass}-${selectedSection} - ${format(new Date(selectedDate), 'MMM d, yyyy')}`
            }
          </h3>
          {!attendanceData?.isSunday && !attendanceData?.holiday && (
            <div className="flex items-center text-sm text-gray-600">
              <FaChartBar className="mr-2" />
              <span>{summary.present} Present • {summary.absent} Absent • {summary.leave} Leave</span>
            </div>
          )}
        </div>

        {attendanceData?.isSunday || attendanceData?.holiday ? (
          <div className="text-center py-12 text-gray-500">
            {attendanceData.isSunday ? (
              <FaSun className="text-4xl mx-auto mb-4 text-blue-400" />
            ) : (
              <FaCalendarTimes className="text-4xl mx-auto mb-4 text-yellow-400" />
            )}
            <p className="text-lg">No attendance marking on {attendanceData.isSunday ? 'Sundays' : 'holidays'}</p>
            <p className="text-sm mt-2">This day will not be counted in attendance percentage calculations.</p>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-12">
            <FaSpinner className="animate-spin text-2xl text-blue-600" />
            <span className="ml-3">Loading students...</span>
          </div>
        ) : attendanceRecords.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {!selectedClass || !selectedSection ? 'Please select class and section' : 'No students found in this class-section.'}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Roll No</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Student Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Father Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Remarks</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Last Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredRecords().map((record) => (
                    <tr key={record._id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{record.rollNo}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{record.name}</div>
                        <div className="text-sm text-gray-600">ID: {record.studentId}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{record.fatherName}</td>
                      <td className="px-4 py-3">
                        <div className="flex space-x-2">
                          {statusOptions.map(status => (
                            <button
                              key={status}
                              onClick={() => handleStatusChange(record._id, status)}
                              disabled={!isEditing}
                              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                                record.status === status
                                  ? status === 'Present' ? 'bg-green-100 text-green-800 border border-green-300' :
                                    status === 'Absent' ? 'bg-red-100 text-red-800 border border-red-300' :
                                    'bg-purple-100 text-purple-800 border border-purple-300'
                                  : isEditing
                                    ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    : 'bg-gray-50 text-gray-400'
                              }`}
                            >
                              {status}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={record.remarks}
                          onChange={(e) => {
                            if (isEditing) {
                              setAttendanceRecords(prev => prev.map(r => 
                                r._id === record._id ? { ...r, remarks: e.target.value } : r
                              ));
                            }
                          }}
                          disabled={!isEditing}
                          placeholder="Add remarks..."
                          className={`w-full px-3 py-2 rounded border ${
                            isEditing 
                              ? 'border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500' 
                              : 'border-gray-200 bg-gray-50'
                          }`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        {record.updatedAt ? (
                          <>
                            <div className="text-sm text-gray-600">
                              {format(new Date(record.updatedAt), 'dd/MM/yy')}
                            </div>
                            <div className="text-xs text-gray-500">
                              {record.markedBy?.name || 'System'}
                            </div>
                          </>
                        ) : (
                          <span className="text-sm text-gray-400">Not marked yet</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Status Legend:</h4>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-600">Present</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-600">Absent</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-600">Leave</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Pending Approval Section */}
      {attendanceData?.pendingAttendance && attendanceData.pendingAttendance.length > 0 && (
        <div className="card mt-6">
          <div className="mb-4 flex justify-between items-center">
            <h3 className="text-xl font-bold text-gray-800 flex items-center">
              <FaClock className="mr-2 text-yellow-600" />
              Pending Teacher Attendance ({attendanceData.pendingCount})
            </h3>
            <button
              onClick={() => handleBulkApprove()}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
            >
              <FaCheckCircle className="mr-2" />
              Approve All
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-yellow-50">
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Student</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Remarks</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Marked By</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {attendanceData.pendingAttendance.map((record) => (
                  <tr key={record._id} className="border-b border-gray-200 hover:bg-yellow-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{record.studentName || record.student?.name}</div>
                      <div className="text-sm text-gray-600">Roll No: {record.rollNo || record.student?.rollNo}</div>
                      <div className="text-xs text-gray-500 mt-1">
        Class: {record.class || record.student?.class || 'Unknown'} | 
        Section: {record.section || record.student?.section || 'Unknown'}
      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        record.status === 'Present' ? 'bg-green-100 text-green-800' :
                        record.status === 'Absent' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">{record.remarks || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-800">{record.markedBy?.name}</div>
                      <div className="text-xs text-gray-500">
                        {format(new Date(record.markedAt), 'hh:mm a')}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleApproveAttendance(record._id)}
                          className="px-3 py-1 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 text-sm flex items-center"
                        >
                          <FaCheckCircle className="mr-1" /> Approve
                        </button>
                        <button
                          onClick={() => setRejectModal(record)}
                          className="px-3 py-1 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 text-sm flex items-center"
                        >
                          <FaTimesCircle className="mr-1" /> Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setViewMode('daily')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${viewMode === 'daily' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Daily View
          </button>
          <button
            onClick={() => setViewMode('monthly')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${viewMode === 'monthly' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Monthly Report
          </button>
          <button
            onClick={() => setViewMode('reports')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${viewMode === 'reports' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Reports
          </button>
        </nav>
      </div>

      {/* Monthly View */}
      {viewMode === 'monthly' && monthlyData && (
        <div className="card">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            Monthly Attendance for {format(new Date(selectedDate), 'MMMM yyyy')} - Class {selectedClass}-{selectedSection}
          </h3>
          
          <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card text-center">
              <div className="text-2xl font-bold text-blue-600">{monthlyData.totalStudents}</div>
              <div className="text-sm text-gray-600">Total Students</div>
            </div>
            <div className="card text-center">
              <div className="text-2xl font-bold text-green-600">{monthlyData.workingDays}</div>
              <div className="text-sm text-gray-600">Working Days</div>
            </div>
            <div className="card text-center">
              <div className="text-2xl font-bold text-yellow-600">{monthlyData.holidays}</div>
              <div className="text-sm text-gray-600">Holidays</div>
            </div>
            <div className="card text-center">
              <div className="text-2xl font-bold text-indigo-600">{monthlyData.summary.monthlyPercentage}%</div>
              <div className="text-sm text-gray-600">Monthly %</div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-sm font-semibold text-gray-700">Date</th>
                  <th className="px-3 py-2 text-sm font-semibold text-gray-700">Day</th>
                  <th className="px-3 py-2 text-sm font-semibold text-gray-700">Present</th>
                  <th className="px-3 py-2 text-sm font-semibold text-gray-700">Absent</th>
                  <th className="px-3 py-2 text-sm font-semibold text-gray-700">Leave</th>
                  <th className="px-3 py-2 text-sm font-semibold text-gray-700">%</th>
                  <th className="px-3 py-2 text-sm font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.dailyData.map((day, index) => (
                  <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm text-gray-700">
                      {format(day.date, 'dd/MM')}
                      {isToday(day.date) && ' (Today)'}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-700">
                      {format(day.date, 'EEE')}
                      {day.isSunday && ' (Sun)'}
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-sm text-green-600 font-medium">{day.present}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-sm text-red-600 font-medium">{day.absent}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-sm text-purple-600 font-medium">{day.leave}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-sm font-medium ${
                        parseFloat(day.percentage) >= 90 ? 'text-green-600' :
                        parseFloat(day.percentage) >= 75 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {day.percentage}%
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {day.isSunday ? (
                        <span className="text-sm text-blue-600">Sunday</span>
                      ) : day.holiday ? (
                        <span className="text-sm text-yellow-600">{day.holiday}</span>
                      ) : day.workingDay ? (
                        <button 
                          className="text-sm text-blue-600 hover:text-blue-800"
                          onClick={() => {
                            setSelectedDate(format(day.date, 'yyyy-MM-dd'));
                            setViewMode('daily');
                          }}
                        >
                          View
                        </button>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reports View */}
      {viewMode === 'reports' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Reports */}
          <div className="card">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Attendance Reports</h3>
            <div className="space-y-4">
              {[
                { 
                  title: 'Daily Attendance Report', 
                  desc: 'Detailed report for selected date', 
                  icon: '📅',
                  action: () => handleExport('daily')
                },
                { 
                  title: 'Monthly Summary', 
                  desc: 'Attendance summary for the month', 
                  icon: '📊',
                  action: () => handleExport('monthly')
                },
                { 
                  title: 'Defaulters List', 
                  desc: 'Students with low attendance', 
                  icon: '⚠️',
                  action: () => toast.success('This feature will be available soon')
                },
                { 
                  title: 'Holiday Calendar', 
                  desc: 'View school holidays', 
                  icon: '🎉',
                  action: () => {
                    const currentYear = new Date().getFullYear();
                    toast.success(`Holiday calendar for ${currentYear} will be available soon`);
                  }
                },
              ].map((report, index) => (
                <div key={index} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <span className="text-2xl mr-4">{report.icon}</span>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800">{report.title}</h4>
                    <p className="text-sm text-gray-600">{report.desc}</p>
                  </div>
                  <button 
                    className="text-sm text-blue-600 hover:text-blue-800"
                    onClick={report.action}
                  >
                    Generate
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="card">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Quick Statistics</h3>
            <div className="space-y-6">
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Today's Summary</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-lg font-bold text-green-600">{summary.present}</div>
                    <div className="text-sm text-gray-600">Present Today</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-lg font-bold">{summary.percentage}%</div>
                    <div className="text-sm text-gray-600">Today's %</div>
                  </div>
                </div>
              </div>
              
              {monthlyData && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Monthly Summary</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="text-lg font-bold text-blue-600">{monthlyData.workingDays}</div>
                      <div className="text-sm text-gray-600">Working Days</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="text-lg font-bold text-indigo-600">{monthlyData.summary.monthlyPercentage}%</div>
                      <div className="text-sm text-gray-600">Monthly %</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Holiday Modal */}
      {holidayModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Add Holiday</h2>
                <button
                  onClick={() => setHolidayModal(false)}
                  className="text-gray-400 hover:text-gray-500 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Holiday Date *
                  </label>
                  <input
                    type="date"
                    value={newHoliday.date}
                    onChange={(e) => setNewHoliday({...newHoliday, date: e.target.value})}
                    className="input-field"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Holiday Title *
                  </label>
                  <input
                    type="text"
                    value={newHoliday.title}
                    onChange={(e) => setNewHoliday({...newHoliday, title: e.target.value})}
                    className="input-field"
                    placeholder="e.g., Eid ul Fitr, Summer Vacation"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Holiday Type
                  </label>
                  <select
                    value={newHoliday.type}
                    onChange={(e) => setNewHoliday({...newHoliday, type: e.target.value})}
                    className="input-field"
                  >
                    {holidayTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={newHoliday.description}
                    onChange={(e) => setNewHoliday({...newHoliday, description: e.target.value})}
                    className="input-field"
                    rows="3"
                    placeholder="Additional details about the holiday..."
                  />
                </div>
                
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    className="btn-secondary px-6"
                    onClick={() => setHolidayModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn-primary px-6"
                    onClick={handleAddHoliday}
                  >
                    Add Holiday
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generate Report Modal */}
      {reportModal && (
        <div className="modal-overlay">
          <div className="modal-content max-w-2xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Generate Attendance Report</h2>
                <button
                  onClick={() => setReportModal(false)}
                  className="text-gray-400 hover:text-gray-500 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Report Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Report Type
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => setReportType('detailed')}
                      className={`p-3 rounded-lg border ${reportType === 'detailed' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
                    >
                      <div className="text-center">
                        <FaFileAlt className={`mx-auto mb-2 ${reportType === 'detailed' ? 'text-blue-600' : 'text-gray-500'}`} />
                        <span className={`text-sm ${reportType === 'detailed' ? 'font-medium text-blue-700' : 'text-gray-700'}`}>
                          Detailed Report
                        </span>
                      </div>
                    </button>
                    <button
                      onClick={() => setReportType('summary')}
                      className={`p-3 rounded-lg border ${reportType === 'summary' ? 'border-green-500 bg-green-50' : 'border-gray-300'}`}
                    >
                      <div className="text-center">
                        <FaChartBar className={`mx-auto mb-2 ${reportType === 'summary' ? 'text-green-600' : 'text-gray-500'}`} />
                        <span className={`text-sm ${reportType === 'summary' ? 'font-medium text-green-700' : 'text-gray-700'}`}>
                          Summary Report
                        </span>
                      </div>
                    </button>
                    <button
                      onClick={() => setReportType('defaulters')}
                      className={`p-3 rounded-lg border ${reportType === 'defaulters' ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                    >
                      <div className="text-center">
                        <FaExclamationTriangle className={`mx-auto mb-2 ${reportType === 'defaulters' ? 'text-red-600' : 'text-gray-500'}`} />
                        <span className={`text-sm ${reportType === 'defaulters' ? 'font-medium text-red-700' : 'text-gray-700'}`}>
                          Defaulters List
                        </span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      value={reportStartDate}
                      onChange={(e) => setReportStartDate(e.target.value)}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date *
                    </label>
                    <input
                      type="date"
                      value={reportEndDate}
                      onChange={(e) => setReportEndDate(e.target.value)}
                      className="input-field"
                      required
                    />
                  </div>
                </div>

                {/* Class and Section */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Class
                    </label>
                    <select
                      className="input-field"
                      value={reportClass}
                      onChange={(e) => setReportClass(e.target.value)}
                    >
                      {classes.map(cls => (
                        <option key={cls} value={cls}>
                          {cls === 'Play Group' || cls === 'Nursery' || cls === 'Prep' ? cls : `Class ${cls}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Section
                    </label>
                    <select
                      className="input-field"
                      value={reportSection}
                      onChange={(e) => setReportSection(e.target.value)}
                    >
                      {sections.map(sec => (
                        <option key={sec} value={sec}>Section {sec}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Report Description */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-700 mb-2">
                    {reportType === 'detailed' ? '📊 Detailed Report' : 
                    reportType === 'summary' ? '📈 Summary Report' : '⚠️ Defaulters List'}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {reportType === 'detailed' ? 
                      'Daily attendance for each student with status and remarks' :
                    reportType === 'summary' ? 
                      'Class-wise attendance summary with percentages and charts' :
                      'Students with attendance below 75% for the selected period'}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    className="btn-secondary px-6"
                    onClick={() => setReportModal(false)}
                    disabled={generatingReport}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={`px-6 py-2 ${generatingReport ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-lg flex items-center`}
                    onClick={handleGenerateReport}
                    disabled={generatingReport}
                  >
                    {generatingReport ? (
                      <>
                        <FaSpinner className="animate-spin mr-2" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <FaPrint className="mr-2" />
                        Generate Report
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Attendance Modal */}
      {rejectModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Reject Attendance</h2>
                <button
                  onClick={() => {
                    setRejectModal(null);
                    setRejectReason('');
                  }}
                  className="text-gray-400 hover:text-gray-500 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="font-medium">Student: {rejectModal.student?.name}</p>
                  <p className="text-sm text-gray-600">Roll No: {rejectModal.student?.rollNo}</p>
                  <p className="mt-2">
                    Status: <span className={`font-medium ${
                      rejectModal.status === 'Present' ? 'text-green-600' :
                      rejectModal.status === 'Absent' ? 'text-red-600' : 'text-yellow-600'
                    }`}>
                      {rejectModal.status}
                    </span>
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Rejection *
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="input-field"
                    rows="3"
                    placeholder="Enter reason for rejecting this attendance..."
                    required
                  />
                </div>
                
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    className="btn-secondary px-6"
                    onClick={() => {
                      setRejectModal(null);
                      setRejectReason('');
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    onClick={() => handleRejectAttendance(rejectModal._id, rejectReason)}
                    disabled={!rejectReason.trim()}
                  >
                    Reject Attendance
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAttendance;