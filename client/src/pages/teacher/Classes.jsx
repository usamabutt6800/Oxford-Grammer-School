
import React, { useState, useEffect } from 'react';
import { 
  FaChalkboardTeacher, FaUsers, FaClock, FaBook,
  FaCalendarAlt, FaUserGraduate, FaChartLine, FaBell,
  FaSpinner, FaArrowRight
} from 'react-icons/fa';
import { format } from 'date-fns';
import { teacherDashboardService } from '../../services/teacherDashboardService';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const TeacherClasses = () => {
  const [assignedClasses, setAssignedClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchAssignedClasses();
  }, []);

  const fetchAssignedClasses = async () => {
    try {
      setLoading(true);
      const response = await teacherDashboardService.getMyClasses();
      
      if (response.success) {
        setAssignedClasses(response.data);
        if (response.data.length > 0) {
          setSelectedClass(response.data[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching assigned classes:', error);
      toast.error('Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  const handleTakeAttendance = (className, section) => {
    navigate('/teacher/attendance', { 
      state: { 
        preselectedClass: `${className}-${section}`,
        date: format(new Date(), 'yyyy-MM-dd')
      } 
    });
  };

  const handleViewStudents = (className, section) => {
    navigate('/teacher/students', { 
      state: { 
        preselectedClass: `${className}-${section}`
      } 
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <FaSpinner className="animate-spin text-4xl text-school-blue" />
        <span className="ml-3 text-lg">Loading classes...</span>
      </div>
    );
  }

  if (assignedClasses.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Classes</h1>
            <p className="text-gray-600">View and manage your assigned classes</p>
          </div>
        </div>
        
        <div className="card text-center py-12">
          <FaChalkboardTeacher className="text-5xl text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Classes Assigned</h3>
          <p className="text-gray-600 max-w-md mx-auto">
            You haven't been assigned any classes yet. Please contact the school administrator 
            to get classes assigned to your profile.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Classes</h1>
          <p className="text-gray-600">View and manage your assigned classes</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {assignedClasses.map((cls) => (
          <div 
            key={`${cls.class}-${cls.section}`}
            className={`card cursor-pointer hover:shadow-lg transition-shadow ${
              selectedClass && selectedClass.class === cls.class && selectedClass.section === cls.section 
                ? 'ring-2 ring-school-blue' 
                : ''
            }`}
            onClick={() => setSelectedClass(cls)}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-800">Class {cls.class}-{cls.section}</h3>
                <p className="text-gray-600">
                  {user?.teacherProfile?.subjects?.[0] || 'Subject'}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm ${
                cls.attendancePercentage >= 90 ? 'bg-green-100 text-green-800' :
                cls.attendancePercentage >= 75 ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {cls.attendancePercentage}% Attendance
              </span>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center text-gray-600">
                <FaClock className="mr-3" />
                <span>8:00 AM - 9:00 AM</span>
              </div>
              <div className="flex items-center text-gray-600">
                <FaUsers className="mr-3" />
                <span>{cls.studentCount} Students</span>
              </div>
              <div className="flex items-center text-gray-600">
                <FaChalkboardTeacher className="mr-3" />
                <span>Room {parseInt(cls.class) * 100 || 101}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between">
                <button 
                  className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTakeAttendance(cls.class, cls.section);
                  }}
                >
                  Take Attendance
                </button>
                <button 
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewStudents(cls.class, cls.section);
                  }}
                >
                  View Students
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedClass && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card lg:col-span-2">
            <h3 className="text-xl font-bold text-gray-800 mb-6">
              Class {selectedClass.class}-{selectedClass.section} - Details
            </h3>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-700 mb-3">Class Schedule</h4>
                <div className="space-y-2">
                  {['Monday', 'Wednesday', 'Friday'].map((day, index) => (
                    <div key={day} className="flex items-center p-3 bg-gray-50 rounded-lg">
                      <FaCalendarAlt className="text-gray-400 mr-3" />
                      <div>
                        <div className="font-medium text-gray-800">{day}</div>
                        <div className="text-sm text-gray-600">8:00 AM - 9:00 AM</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-700 mb-3">Quick Stats</h4>
                <div className="space-y-3">
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center">
                      <FaUserGraduate className="text-green-600 mr-3" />
                      <div>
                        <div className="font-bold text-gray-800">{selectedClass.studentCount}</div>
                        <div className="text-sm text-gray-600">Total Students</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center">
                      <FaChartLine className="text-blue-600 mr-3" />
                      <div>
                        <div className="font-bold text-gray-800">{selectedClass.attendancePercentage}%</div>
                        <div className="text-sm text-gray-600">Attendance Rate</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center">
                      <FaBell className="text-yellow-600 mr-3" />
                      <div>
                        <div className="font-bold text-gray-800">{selectedClass.todayAbsent}</div>
                        <div className="text-sm text-gray-600">Absent Today</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="font-semibold text-gray-700 mb-3">Class Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Class Teacher</div>
                  <div className="font-medium text-gray-800">
                    {selectedClass.teacherName || `${user?.name}`}
                  </div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Class Size</div>
                  <div className="font-medium text-gray-800">
                    {selectedClass.studentCount} / 40 Students
                  </div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Today's Present</div>
                  <div className="font-medium text-gray-800">
                    {selectedClass.todayPresent} Students
                  </div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Today's Absent</div>
                  <div className="font-medium text-gray-800">
                    {selectedClass.todayAbsent} Students
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h4 className="font-semibold text-gray-700 mb-4">Quick Actions</h4>
            <div className="space-y-3">
              <button 
                className="w-full p-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center"
                onClick={() => handleTakeAttendance(selectedClass.class, selectedClass.section)}
              >
                <FaBook className="mr-2" />
                Take Today's Attendance
              </button>
              <button 
                className="w-full p-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 flex items-center justify-center"
                onClick={() => handleViewStudents(selectedClass.class, selectedClass.section)}
              >
                <FaChalkboardTeacher className="mr-2" />
                View Student List
              </button>
              <button 
                className="w-full p-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 flex items-center justify-center"
                onClick={() => navigate('/teacher/attendance')}
              >
                <FaCalendarAlt className="mr-2" />
                View Attendance History
              </button>
              <button 
                className="w-full p-3 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 flex items-center justify-center"
                onClick={() => toast.success('Report generation feature coming soon!')}
              >
                <FaUsers className="mr-2" />
                Generate Class Report
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="font-semibold text-gray-700 mb-3">Attendance Trend</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Today</span>
                  <span className="text-sm font-medium text-gray-800">{selectedClass.attendancePercentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: `${selectedClass.attendancePercentage}%` }}
                  ></div>
                </div>
                
                <div className="mt-4">
                  <button 
                    className="w-full flex items-center justify-center text-blue-600 hover:text-blue-800"
                    onClick={() => navigate('/teacher/attendance')}
                  >
                    View Full Attendance Report
                    <FaArrowRight className="ml-2" />
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

export default TeacherClasses;
