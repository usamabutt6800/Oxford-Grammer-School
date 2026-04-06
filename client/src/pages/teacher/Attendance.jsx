import React, { useState, useEffect } from 'react';
import { 
  FaCalendarAlt, FaSearch, FaSave, FaPrint, 
  FaUserCheck, FaUserTimes, FaClock, FaExclamationTriangle,
  FaSpinner, FaFilter, FaEdit, FaCheckCircle, FaTimesCircle, FaBell,
  FaEye, FaThumbsUp, FaUserTie, FaBan
} from 'react-icons/fa';
import { format, isToday, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { teacherDashboardService } from '../../services/teacherDashboardService';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from 'react-router-dom';

const TeacherAttendance = () => {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(format(today, 'yyyy-MM-dd'));
  const [selectedClass, setSelectedClass] = useState('');
  const [attendanceData, setAttendanceData] = useState({
    summary: { 
      total: 0, 
      present: 0, 
      absent: 0, 
      leave: 0, 
      percentage: 0 
    },
    students: [],
    isMarked: false,
    hasPendingAttendance: false,
    hasApprovedAttendance: false,
    isEditable: false,
    isToday: true
  });
  const [assignedClasses, setAssignedClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingAttendance, setPendingAttendance] = useState([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [approvingId, setApprovingId] = useState(null);
  const { user } = useAuth();
  const location = useLocation();
  
  const statusOptions = ['Present', 'Absent', 'Leave'];

  useEffect(() => {
    fetchAssignedClasses();
    
    if (location.state?.preselectedClass) {
      setSelectedClass(location.state.preselectedClass);
    }
  }, []);

  useEffect(() => {
    if (selectedClass && selectedDate) {
      fetchClassAttendance();
    }
  }, [selectedClass, selectedDate]);

  // Fetch pending attendance for admin approval
  useEffect(() => {
    if (user?.role === 'admin') {
      fetchPendingAttendance();
    }
  }, [user]);

  const fetchPendingAttendance = async () => {
    try {
      setLoadingPending(true);
      const response = await teacherDashboardService.getPendingAttendance();
      if (response.success) {
        setPendingAttendance(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching pending attendance:', error);
    } finally {
      setLoadingPending(false);
    }
  };

  const handleApproveAttendance = async (attendanceId) => {
    if (!attendanceId) return;
    
    try {
      setApprovingId(attendanceId);
      const response = await teacherDashboardService.approveAttendance(attendanceId);
      
      if (response.success) {
        toast.success('Attendance approved successfully!');
        setPendingAttendance(prev => prev.filter(item => item._id !== attendanceId));
        if (selectedClass && selectedDate) {
          fetchClassAttendance();
        }
      } else {
        toast.error(response.error || 'Failed to approve attendance');
      }
    } catch (error) {
      console.error('Error approving attendance:', error);
      toast.error(error.response?.data?.error || 'Failed to approve attendance');
    } finally {
      setApprovingId(null);
    }
  };

  // Helper function to transform API response
  const transformAttendanceData = (apiData) => {
    if (!apiData) return null;
    
    // Check for holiday/sunday/future date response
    if (apiData.isFutureDate || apiData.isSunday || apiData.holiday) {
      return {
        summary: { total: 0, present: 0, absent: 0, leave: 0, percentage: 0 },
        students: [],
        isMarked: false,
        isFutureDate: apiData.isFutureDate || false,
        isSunday: apiData.isSunday || false,
        holiday: apiData.holiday || null,
        holidayType: apiData.holidayType || null,
        message: apiData.message || 'No school today',
        canMarkAttendance: false,
        hasPendingAttendance: false,
        hasApprovedAttendance: false,
        isEditable: false,
        isToday: isToday(parseISO(selectedDate))
      };
    }
    
    // Extract summary from API response
    let summary = {
      total: apiData.summary?.total || 0,
      present: apiData.summary?.approved?.present || apiData.summary?.present || 0,
      absent: apiData.summary?.approved?.absent || apiData.summary?.absent || 0,
      leave: apiData.summary?.approved?.leave || apiData.summary?.leave || 0,
      percentage: apiData.summary?.approved?.percentage || apiData.summary?.percentage || 0
    };
    
    // Transform students data
    const transformedStudents = (apiData.students || []).map(student => {
      let approvalStatus = 'Not Marked';
      if (student.approvalStatus) {
        approvalStatus = student.approvalStatus;
      } else if (apiData.hasApprovedAttendance) {
        approvalStatus = 'Approved';
      } else if (apiData.hasPendingAttendance) {
        approvalStatus = 'Pending';
      }
      
      return {
        student: {
          _id: student.student?._id || student._id,
          name: student.student?.name || student.name || '',
          rollNo: student.student?.rollNo || student.rollNo || '',
          fatherName: student.student?.fatherName || student.fatherName || ''
        },
        status: student.status || 'Present',
        remarks: student.remarks || '',
        approvalStatus: approvalStatus,
        _id: student._id,
        canEdit: student.canEdit !== undefined ? student.canEdit : true,
        isTeacherMarked: student.isTeacherMarked || false
      };
    });
    
    return {
      summary,
      students: transformedStudents,
      isMarked: apiData.isMarked || apiData.hasApprovedAttendance || apiData.hasPendingAttendance,
      hasPendingAttendance: apiData.hasPendingAttendance || false,
      hasApprovedAttendance: apiData.hasApprovedAttendance || false,
      isEditable: apiData.isEditable !== undefined ? apiData.isEditable : true,
      isToday: apiData.isToday !== undefined ? apiData.isToday : isToday(parseISO(selectedDate)),
      canMarkAttendance: apiData.canMarkAttendance !== undefined ? apiData.canMarkAttendance : true
    };
  };

  const fetchAssignedClasses = async () => {
    try {
      const response = await teacherDashboardService.getMyClasses();
      const classes = (response.data || []).map(cls => `${cls.class}-${cls.section}`);
      setAssignedClasses(classes);
      
      if (classes.length > 0 && !selectedClass) {
        setSelectedClass(classes[0]);
      }
    } catch (error) {
      console.error('Error fetching assigned classes:', error);
      toast.error('Failed to load assigned classes');
    }
  };

  const fetchClassAttendance = async () => {
    if (!selectedClass) return;
    
    try {
      setLoading(true);
      const [className, section] = selectedClass.split('-');
      const response = await teacherDashboardService.getClassAttendance(
        selectedDate, 
        className, 
        section
      );
      
      if (response.success) {
        const transformedData = transformAttendanceData(response.data);
        if (transformedData) {
          setAttendanceData(transformedData);
          
          // Set editing mode - only if it's today, not a holiday, and editable
          const canEdit = transformedData.isEditable && 
                         !transformedData.hasApprovedAttendance &&
                         transformedData.isToday &&
                         !transformedData.isSunday &&
                         !transformedData.holiday &&
                         !transformedData.isFutureDate;
          setIsEditing(canEdit);
        }
      } else {
        toast.error(response.error || 'Failed to load attendance');
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
      toast.error(error.response?.data?.error || 'Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (studentId, newStatus) => {
    if (!isEditing) {
      toast.error('You can only edit today\'s pending attendance!');
      return;
    }
    
    setAttendanceData(prev => {
      const updatedStudents = prev.students.map(student => 
        student.student._id === studentId 
          ? { ...student, status: newStatus }
          : student
      );
      
      const updatedSummary = calculateSummary(updatedStudents);
      
      return {
        ...prev,
        students: updatedStudents,
        summary: updatedSummary
      };
    });
  };

  const handleRemarksChange = (studentId, remarks) => {
    if (!isEditing) return;
    
    setAttendanceData(prev => ({
      ...prev,
      students: prev.students.map(student => 
        student.student._id === studentId 
          ? { ...student, remarks }
          : student
      )
    }));
  };

  const calculateSummary = (students) => {
    const summary = students.reduce((acc, student) => {
      acc[student.status] = (acc[student.status] || 0) + 1;
      acc.total = (acc.total || 0) + 1;
      return acc;
    }, {});
    
    return {
      total: summary.total || 0,
      present: summary.Present || 0,
      absent: summary.Absent || 0,
      leave: summary.Leave || 0,
      percentage: summary.total ? ((summary.Present || 0) / summary.total * 100).toFixed(1) : 0
    };
  };

  const handleSaveAttendance = async () => {
  if (!selectedClass) {
    toast.error('Please select a class first');
    return;
  }

  // ========== ADD THIS CHECK ==========
  // Check for holidays/sundays/future dates BEFORE anything else
  if (attendanceData.isSunday || attendanceData.holiday) {
    toast.error('Cannot mark attendance on holidays');
    return;
  }

  if (attendanceData.isFutureDate) {
    toast.error('Cannot mark attendance for future dates');
    return;
  }
  // ========== END CHECK ==========

  if (!isEditing) {
    toast.error('You cannot edit attendance for this date');
    return;
  }

  // Check if it's today
  if (!isToday(parseISO(selectedDate))) {
    toast.error('Teachers can only mark attendance for today');
    return;
  }

  try {
    setSaving(true);
    const [className, section] = selectedClass.split('-');
    
    const attendanceRecords = attendanceData.students.map(student => ({
      studentId: student.student._id,
      status: student.status,
      remarks: student.remarks || ''
    }));

    const response = await teacherDashboardService.markClassAttendance({
      date: selectedDate,
      class: className,
      section: section,
      students: attendanceRecords
    });

    if (response.success) {
      toast.success('Attendance submitted for admin approval!');
      setIsEditing(false);
      
      // Update local state immediately without fetching
      setAttendanceData(prev => ({
        ...prev,
        isMarked: true,
        hasPendingAttendance: true,
        hasApprovedAttendance: false,
        students: prev.students.map(student => ({
          ...student,
          approvalStatus: 'Pending'
        }))
      }));
      
      const updatedSummary = calculateSummary(attendanceData.students);
      setAttendanceData(prev => ({
        ...prev,
        summary: updatedSummary
      }));

      // If admin is viewing, refresh pending list
      if (user?.role === 'admin') {
        fetchPendingAttendance();
      }
    }
  } catch (error) {
    console.error('Error saving attendance:', error);
    const errorMsg = error.response?.data?.error;
    
    if (errorMsg?.includes('already marked')) {
      toast.error('Attendance already submitted for approval. Wait for admin to approve.');
      setIsEditing(false);
    } else if (errorMsg?.includes('Sunday') || errorMsg?.includes('holiday')) {
      toast.error(errorMsg);
      setIsEditing(false);
    } else {
      toast.error(errorMsg || 'Failed to save attendance');
    }
  } finally {
    setSaving(false);
  }
};

  const handleDateChange = (e) => {
    const newDate = e.target.value;
    setSelectedDate(newDate);
  };

  const handleEditToggle = () => {
    const isTodayDate = isToday(parseISO(selectedDate));
    
    if (!isTodayDate) {
      toast.error('You can only edit today\'s attendance');
      return;
    }
    
    if (attendanceData.hasApprovedAttendance) {
      toast.error('Attendance already approved by admin. Cannot edit.');
      return;
    }
    
    if (attendanceData.isSunday || attendanceData.holiday || attendanceData.isFutureDate) {
      toast.error(attendanceData.message || 'Cannot edit attendance');
      return;
    }
    
    setIsEditing(!isEditing);
  };

  const getFilteredStudents = () => {
    return attendanceData.students.filter(student =>
      student.student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.student.rollNo.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const summary = attendanceData.summary;
  const isHolidayOrSunday = attendanceData.isSunday || attendanceData.holiday || attendanceData.isFutureDate;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Attendance Management</h1>
          <p className="text-gray-600">Mark and manage attendance for your assigned classes</p>
        </div>
      </div>

      {/* Stats Cards */}
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
          <div className="text-2xl font-bold text-yellow-600">{summary.leave}</div>
          <div className="text-sm text-gray-600">Leave</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-purple-600">
            {summary.percentage}%
          </div>
          <div className="text-sm text-gray-600">Attendance %</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-orange-600">
            {attendanceData.hasPendingAttendance ? 'Pending' : attendanceData.hasApprovedAttendance ? 'Approved' : 'Not Marked'}
          </div>
          <div className="text-sm text-gray-600">Status</div>
        </div>
      </div>

      {/* Pending Attendance Section for Admin */}
      {user?.role === 'admin' && (
        <div className="card">
          <div className="flex items-center mb-4">
            <FaUserTie className="text-blue-600 mr-2" />
            <h3 className="text-xl font-bold text-gray-800">Pending Teacher Attendance</h3>
            {loadingPending && (
              <FaSpinner className="animate-spin ml-2 text-blue-600" />
            )}
          </div>
          
          {pendingAttendance.length === 0 ? (
            <div className="p-4 text-center bg-gray-50 rounded-lg">
              <p className="text-gray-500">No pending attendance to approve</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Teacher</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Class</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Student</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingAttendance.map(item => (
                    <tr key={item._id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <FaUserTie className="text-gray-400 mr-2" />
                          <span className="font-medium">{item.markedBy?.name || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {item.class}-{item.section}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {format(new Date(item.date), 'dd/MM/yyyy')}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium">
                            {item.student?.firstName || 'Unknown'} {item.student?.lastName || ''}
                          </div>
                          <div className="text-sm text-gray-500">Roll No: {item.student?.rollNo || 'N/A'}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          item.status === 'Present' ? 'bg-green-100 text-green-800' :
                          item.status === 'Absent' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {item.status === 'Present' ? '✓ Present' : item.status === 'Absent' ? '✗ Absent' : '📝 Leave'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => handleApproveAttendance(item._id)}
                            disabled={approvingId === item._id}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center transition-colors"
                          >
                            {approvingId === item._id ? (
                              <FaSpinner className="animate-spin mr-2" />
                            ) : (
                              <FaThumbsUp className="mr-2" />
                            )}
                            {approvingId === item._id ? 'Approving...' : 'Approve'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FaCalendarAlt className="inline mr-2" />
              Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              className="input-field"
              max={format(new Date(), 'yyyy-MM-dd')}
            />
            <div className="mt-1 text-sm text-gray-500">
              {format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy')}
              {isToday(parseISO(selectedDate)) && ' (Today)'}
              {!isToday(parseISO(selectedDate)) && ' (View Only)'}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FaFilter className="inline mr-2" />
              Select Class
            </label>
            {assignedClasses.length === 0 ? (
              <div className="p-3 bg-yellow-50 text-yellow-800 rounded-lg text-sm">
                No classes assigned. Contact administrator.
              </div>
            ) : (
              <select
                className="input-field"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                disabled={loading}
              >
                <option value="">Select a class</option>
                {assignedClasses.map(cls => (
                  <option key={cls} value={cls}>Class {cls}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Actions
            </label>
            <div className="flex space-x-2">
              {isEditing ? (
                <>
                  <button
                    onClick={handleSaveAttendance}
                    disabled={saving || isHolidayOrSunday}
                    className={`flex-1 px-4 py-2 rounded-lg flex items-center justify-center transition-colors ${
                      isHolidayOrSunday || saving
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    {saving ? (
                      <FaSpinner className="animate-spin mr-2" />
                    ) : (
                      <FaSave className="mr-2" />
                    )}
                    {saving ? 'Saving...' : 'Submit for Approval'}
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </>
              ) : isToday(parseISO(selectedDate)) && !attendanceData.hasApprovedAttendance && attendanceData.students.length > 0 ? (
                <button
                  onClick={handleEditToggle}
                  disabled={isHolidayOrSunday}
                  className={`flex-1 px-4 py-2 rounded-lg flex items-center justify-center transition-colors ${
                    isHolidayOrSunday
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  <FaEdit className="mr-2" />
                  {attendanceData.hasPendingAttendance ? 'Update Attendance' : 'Mark Attendance'}
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-4">
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
              disabled={isHolidayOrSunday || attendanceData.students.length === 0}
            />
          </div>
        </div>

        {/* Holiday/Sunday/Future Date Messages */}
        {attendanceData.isSunday && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center">
              <FaBan className="text-blue-600 mr-3" />
              <div>
                <h4 className="font-semibold text-blue-800">Sunday - No School</h4>
                <p className="text-sm text-blue-700">
                  {attendanceData.message || 'Sunday is a holiday. No attendance to mark.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {attendanceData.holiday && (
          <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center">
              <FaBan className="text-purple-600 mr-3" />
              <div>
                <h4 className="font-semibold text-purple-800">Holiday - {attendanceData.holidayType || 'General'}</h4>
                <p className="text-sm text-purple-700">
                  {attendanceData.message || `Today is ${attendanceData.holiday}. No attendance to mark.`}
                </p>
              </div>
            </div>
          </div>
        )}

        {attendanceData.isFutureDate && (
          <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center">
              <FaExclamationTriangle className="text-orange-600 mr-3" />
              <div>
                <h4 className="font-semibold text-orange-800">Future Date</h4>
                <p className="text-sm text-orange-700">
                  {attendanceData.message || 'Cannot view attendance for future dates.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Status Messages */}
        {attendanceData.hasApprovedAttendance && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <FaCheckCircle className="text-green-600 mr-3" />
              <div>
                <h4 className="font-semibold text-green-800">Attendance Approved</h4>
                <p className="text-sm text-green-700">
                  This attendance has been approved by admin and cannot be modified.
                </p>
              </div>
            </div>
          </div>
        )}

        {attendanceData.hasPendingAttendance && !isHolidayOrSunday && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <FaBell className="text-yellow-600 mr-3" />
              <div>
                <h4 className="font-semibold text-yellow-800">Pending Admin Approval</h4>
                <p className="text-sm text-yellow-700">
                  Your attendance is pending approval from admin. You can still update it today.
                </p>
              </div>
            </div>
          </div>
        )}

        {!isToday(parseISO(selectedDate)) && !attendanceData.hasApprovedAttendance && !isHolidayOrSunday && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center">
              <FaExclamationTriangle className="text-blue-600 mr-3" />
              <div>
                <h4 className="font-semibold text-blue-800">View Only Mode</h4>
                <p className="text-sm text-blue-700">
                  You can only view attendance for past dates. Only today's attendance can be marked/updated.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Attendance Table */}
      {loading ? (
        <div className="card flex justify-center items-center py-12">
          <FaSpinner className="animate-spin text-3xl text-school-blue mr-3" />
          <span>Loading attendance data...</span>
        </div>
      ) : !selectedClass ? (
        <div className="card text-center py-12">
          <FaFilter className="text-4xl text-gray-400 mx-auto mb-3" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Select a Class</h3>
          <p className="text-gray-600">Please select a class to view and mark attendance</p>
        </div>
      ) : isHolidayOrSunday ? (
        <div className="card text-center py-12">
          <FaBan className="text-4xl text-gray-400 mx-auto mb-3" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            {attendanceData.isSunday ? 'Sunday - No School' : attendanceData.isFutureDate ? 'Future Date' : 'Holiday'}
          </h3>
          <p className="text-gray-600">{attendanceData.message || 'No attendance to display for this date.'}</p>
          {attendanceData.holiday && (
            <div className="mt-4 inline-flex items-center px-4 py-2 bg-purple-100 text-purple-800 rounded-lg">
              <span className="font-medium">{attendanceData.holiday}</span>
              {attendanceData.holidayType && (
                <span className="ml-2 text-sm bg-purple-200 text-purple-800 px-2 py-1 rounded">
                  {attendanceData.holidayType}
                </span>
              )}
            </div>
          )}
        </div>
      ) : attendanceData.students.length === 0 ? (
        <div className="card text-center py-12">
          <FaUserTimes className="text-4xl text-gray-400 mx-auto mb-3" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Students Found</h3>
          <p className="text-gray-600">No students are enrolled in this class</p>
        </div>
      ) : (
        <div className="card">
          <div className="mb-4 flex justify-between items-center">
            <h3 className="text-xl font-bold text-gray-800">
              Attendance for Class {selectedClass} - {format(parseISO(selectedDate), 'MMM d, yyyy')}
              {attendanceData.hasApprovedAttendance && (
                <span className="ml-2 text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
                  ✓ Approved
                </span>
              )}
              {attendanceData.hasPendingAttendance && (
                <span className="ml-2 text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                  ⏳ Pending Approval
                </span>
              )}
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Roll No</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Student Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Father's Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Approval</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredStudents().map((record) => (
                  <tr key={record.student._id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{record.student.rollNo}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{record.student.name}</td>
                    <td className="px-4 py-3 text-gray-600">{record.student.fatherName}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {statusOptions.map(status => (
                          <button
                            key={status}
                            onClick={() => handleStatusChange(record.student._id, status)}
                            disabled={!isEditing || record.approvalStatus === 'Approved' || isHolidayOrSunday}
                            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                              record.status === status
                                ? status === 'Present' ? 'bg-green-100 text-green-800 border border-green-300' :
                                  status === 'Absent' ? 'bg-red-100 text-red-800 border border-red-300' :
                                  'bg-yellow-100 text-yellow-800 border border-yellow-300'
                                : isEditing && record.approvalStatus !== 'Approved' && !isHolidayOrSunday
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
                      {record.approvalStatus === 'Pending' ? (
                        <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                          ⏳ Pending Approval
                        </span>
                      ) : record.approvalStatus === 'Approved' ? (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                          ✓ Approved
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                          Not Marked
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={record.remarks || ''}
                        onChange={(e) => handleRemarksChange(record.student._id, e.target.value)}
                        disabled={!isEditing || record.approvalStatus === 'Approved' || isHolidayOrSunday}
                        placeholder="Add remarks..."
                        className={`w-full px-3 py-2 rounded border ${
                          isEditing && record.approvalStatus !== 'Approved' && !isHolidayOrSunday
                            ? 'border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500' 
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend and Instructions */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
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
                    <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-600">Leave</span>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-3">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-100 border border-green-300 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-600">Approved</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-600">Pending</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-gray-100 border border-gray-300 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-600">Not Marked</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Teacher Instructions:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• You can only mark/update attendance for today's date</li>
                  <li>• Attendance goes to "Pending" status and requires admin approval</li>
                  <li>• Once approved by admin, attendance cannot be modified</li>
                  <li>• You can update pending attendance throughout the day</li>
                  <li>• Contact admin for corrections to approved/past attendance</li>
                  <li>• No attendance on Sundays and declared holidays</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherAttendance;