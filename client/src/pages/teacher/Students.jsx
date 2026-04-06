
import React, { useState, useEffect } from 'react';
import { FaSearch, FaFilter, FaEye, FaSpinner, FaUserGraduate, FaPhone, FaCalendar } from 'react-icons/fa';
import { teacherDashboardService } from '../../services/teacherDashboardService';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';

const TeacherStudents = () => {
  const [students, setStudents] = useState([]);
  const [classStats, setClassStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('All');
  const [availableClasses, setAvailableClasses] = useState([]);
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    fetchStudents();
    fetchAvailableClasses();
    
    // Check for preselected class from navigation
    if (location.state?.preselectedClass) {
      setSelectedClass(location.state.preselectedClass);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [selectedClass, searchTerm]);

  const fetchAvailableClasses = async () => {
    try {
      const response = await teacherDashboardService.getMyClasses();
      const classes = response.data.map(cls => `${cls.class}-${cls.section}`);
      setAvailableClasses(classes);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      
      let className = '', section = '';
      if (selectedClass !== 'All') {
        [className, section] = selectedClass.split('-');
      }

      const response = await teacherDashboardService.getMyStudents(
        className || undefined,
        section || undefined,
        searchTerm || undefined
      );

      if (response.success) {
        setStudents(response.data);
        setClassStats(response.classStats || []);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceColor = (percentage) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAttendanceBgColor = (percentage) => {
    if (percentage >= 90) return 'bg-green-100 text-green-800';
    if (percentage >= 75) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const calculateAttendancePercentage = (attendanceSummary) => {
    if (!attendanceSummary || attendanceSummary.totalDays === 0) return 0;
    return Math.round((attendanceSummary.presentDays / attendanceSummary.totalDays) * 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Student Directory</h1>
          <p className="text-gray-600">View student information from your assigned classes</p>
        </div>
      </div>

      {classStats.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {classStats.map((stat, index) => (
            <div key={index} className="card text-center">
              <div className="text-lg font-bold text-gray-800">{stat.className}</div>
              <div className="text-2xl font-bold text-blue-600 mt-1">{stat.total}</div>
              <div className="text-sm text-gray-600">
                <span className="text-green-600">{stat.present} Present</span>
                {' • '}
                <span className="text-red-600">{stat.absent} Absent</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Students
            </label>
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, roll no, or father's name..."
                className="input-field pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Class
            </label>
            <select
              className="input-field"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              disabled={loading}
            >
              <option value="All">All Classes</option>
              {availableClasses.map(cls => (
                <option key={cls} value={cls}>Class {cls}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Teacher Note
            </label>
            <div className="p-3 bg-blue-50 text-blue-800 rounded-lg text-sm">
              <FaUserGraduate className="inline mr-2" />
              You can view students from {availableClasses.length} assigned classes
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <FaSpinner className="animate-spin text-2xl text-school-blue mr-3" />
            <span>Loading students...</span>
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-8">
            <FaUserGraduate className="text-4xl text-gray-400 mx-auto mb-3" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Students Found</h3>
            <p className="text-gray-600">
              {searchTerm 
                ? `No students match your search "${searchTerm}"`
                : 'No students found in the selected class'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Roll No</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Student Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Class</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Father's Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Contact</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Attendance</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Today's Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const attendancePercentage = calculateAttendancePercentage(student.attendanceSummary);
                  
                  return (
                    <tr key={student._id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{student.rollNo}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{student.fullName}</div>
                        {student.motherName && (
                          <div className="text-sm text-gray-600">Mother: {student.motherName}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                          {student.currentClass}-{student.section}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{student.fatherName}</td>
                      <td className="px-4 py-3">
                        {student.phone && (
                          <div className="flex items-center text-gray-600">
                            <FaPhone className="mr-2 text-sm" />
                            <span className="text-sm">{student.phone}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-sm ${getAttendanceBgColor(attendancePercentage)}`}>
                          {attendancePercentage}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className={`px-3 py-1 rounded text-sm text-center ${
                            student.todayStatus === 'Present' ? 'bg-green-100 text-green-800' :
                            student.todayStatus === 'Absent' ? 'bg-red-100 text-red-800' :
                            student.todayStatus === 'Leave' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {student.todayStatus}
                          </span>
                          {student.todayRemarks && (
                            <span className="text-xs text-gray-500 mt-1 truncate max-w-[150px]">
                              {student.todayRemarks}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Showing {students.length} students
              {selectedClass !== 'All' && ` in Class ${selectedClass}`}
            </div>
            <button
              onClick={fetchStudents}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
            >
              <FaFilter className="mr-2" />
              Refresh List
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Teacher Permissions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-gray-700 mb-2">Allowed Actions:</h4>
            <ul className="space-y-2 text-green-600">
              <li className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                View student information from assigned classes
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                Mark daily attendance for assigned classes
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                View class schedules and student attendance history
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-700 mb-2">Restricted Actions:</h4>
            <ul className="space-y-2 text-red-600">
              <li className="flex items-center">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                Edit student personal information
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                View or modify fee information
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                Add or remove students from classes
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> For any student information updates or corrections, 
            please contact the school administrator. You can only view and mark attendance 
            for students in your assigned classes.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TeacherStudents;
