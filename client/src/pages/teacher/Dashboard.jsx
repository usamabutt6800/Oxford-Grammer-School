import React, { useState, useEffect } from 'react';
import { 
  FaChalkboardTeacher, FaUsers, FaCalendarCheck, FaBell,
  FaClock, FaChartLine, FaExclamationTriangle, FaSpinner,
  FaFileExport, FaPrint, FaCalendarAlt
} from 'react-icons/fa';
import { format, isToday, startOfWeek, endOfWeek } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import { teacherDashboardService } from '../../services/teacherDashboardService';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const TeacherDashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    stats: {
      totalClasses: 0,
      totalStudents: 0,
      todayAttendance: 0,
      pendingTasks: 0
    },
    assignedClasses: [],
    classStats: [],
    todaySchedule: [],
    upcomingEvents: [],
    recentActivities: []
  });
  
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState(null);
  const [attendanceCheck, setAttendanceCheck] = useState({});
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const [statsResponse, classesResponse] = await Promise.all([
        teacherDashboardService.getDashboardStats(),
        teacherDashboardService.getMyClasses()
      ]);
      
      const today = new Date();
      const dayOfWeek = format(today, 'EEEE');
      const todaySchedule = classesResponse.data.map(cls => ({
        ...cls,
        time: '8:00 AM - 9:00 AM',
        day: dayOfWeek
      }));

      // Check attendance for each class
      const attendanceChecks = {};
      for (const cls of classesResponse.data) {
        try {
          const checkResult = await teacherDashboardService.checkTodayAttendance(cls.class, cls.section);
          attendanceChecks[`${cls.class}-${cls.section}`] = checkResult.data;
        } catch (error) {
          console.error(`Error checking attendance for ${cls.class}-${cls.section}:`, error);
        }
      }

      setDashboardData({
        stats: statsResponse.data,
        assignedClasses: classesResponse.data,
        classStats: statsResponse.data.classStats || [],
        todaySchedule: todaySchedule,
        upcomingEvents: [
          { id: 1, title: 'Monthly Test', date: 'Jan 25, 2024', class: '10-A' },
          { id: 2, title: 'Parent-Teacher Meeting', date: 'Jan 28, 2024', class: 'All' },
        ],
        recentActivities: [
          { id: 1, action: 'Marked attendance for Class 10-A', time: 'Today, 8:15 AM' },
          { id: 2, action: 'Updated test marks for Class 9-B', time: 'Yesterday, 3:30 PM' },
        ]
      });

      setAttendanceCheck(attendanceChecks);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
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

  const handleGenerateReport = async (className, section) => {
    try {
      const today = new Date();
      const startDate = format(startOfWeek(today), 'yyyy-MM-dd');
      const endDate = format(endOfWeek(today), 'yyyy-MM-dd');

      toast.loading('Generating attendance report...', { id: 'report' });
      
      const reportData = await teacherDashboardService.getAttendanceReport(
        startDate,
        endDate,
        className,
        section
      );

      // Open report in new tab for printing
      const reportWindow = window.open('', '_blank');
      reportWindow.document.write(`
        <html>
          <head>
            <title>Attendance Report - Class ${className}-${section}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { text-align: center; margin-bottom: 30px; }
              .header h1 { margin: 0; color: #333; }
              .header p { margin: 5px 0; color: #666; }
              .summary { display: flex; justify-content: space-between; margin: 20px 0; }
              .summary-box { flex: 1; text-align: center; padding: 15px; margin: 0 5px; background: #f5f5f5; border-radius: 5px; }
              .summary-box h3 { margin: 0; font-size: 24px; }
              .summary-box p { margin: 5px 0; color: #666; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
              th { background-color: #f2f2f2; font-weight: bold; }
              tr:nth-child(even) { background-color: #f9f9f9; }
              .footer { margin-top: 30px; text-align: right; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Attendance Report</h1>
              <p>Class: ${className}-${section}</p>
              <p>Period: ${startDate} to ${endDate}</p>
            </div>
            
            <div class="summary">
              <div class="summary-box">
                <h3>${reportData.data.classSummary.totalStudents}</h3>
                <p>Total Students</p>
              </div>
              <div class="summary-box">
                <h3>${reportData.data.classSummary.averageAttendance}%</h3>
                <p>Average Attendance</p>
              </div>
              <div class="summary-box">
                <h3>${reportData.data.classSummary.totalDays}</h3>
                <p>Working Days</p>
              </div>
            </div>
            
            <table>
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Student Name</th>
                  <th>Total Days</th>
                  <th>Present Days</th>
                  <th>Absent Days</th>
                  <th>Leave Days</th>
                  <th>Attendance %</th>
                </tr>
              </thead>
              <tbody>
                ${reportData.data.studentReports.map(student => `
                  <tr>
                    <td>${student.rollNo}</td>
                    <td>${student.name}</td>
                    <td>${student.totalDays}</td>
                    <td>${student.presentDays}</td>
                    <td>${student.absentDays}</td>
                    <td>${student.leaveDays}</td>
                    <td>${student.attendancePercentage}%</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            
            <div class="footer">
              <p>Generated on: ${format(new Date(), 'yyyy-MM-dd HH:mm')}</p>
              <p>School Management System</p>
            </div>
            
            <script>
              window.onload = function() {
                window.print();
              }
            </script>
          </body>
        </html>
      `);
      reportWindow.document.close();
      
      toast.dismiss('report');
      toast.success('Report generated successfully');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.dismiss('report');
      toast.error('Failed to generate report');
    }
  };

  const getAttendanceStatusBadge = (className, section) => {
    const key = `${className}-${section}`;
    const check = attendanceCheck[key];
    
    if (!check) {
      return (
        <span className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800">
          Loading...
        </span>
      );
    }

    if (check.isFullyMarked) {
      return (
        <span className="px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
          ✓ Attendance Marked ({check.percentageMarked}%)
        </span>
      );
    } else if (check.markedCount > 0) {
      return (
        <span className="px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800">
          ⚠ Partial ({check.markedCount}/{check.totalStudents})
        </span>
      );
    } else {
      return (
        <span className="px-3 py-1 rounded-full text-sm bg-red-100 text-red-800">
          ✗ Not Marked
        </span>
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <FaSpinner className="animate-spin text-4xl text-school-blue" />
        <span className="ml-3 text-lg">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Teacher Dashboard</h1>
          <p className="text-gray-600">
            Welcome back, {user?.teacherProfile?.firstName || user?.name}! Here's your overview for today.
          </p>
        </div>
        <div className="mt-4 md:mt-0">
          <div className="text-sm text-gray-600">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
              <FaChalkboardTeacher size={24} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Assigned Classes</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData.stats.totalClasses}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-green-100 text-green-600">
              <FaUsers size={24} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Students</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData.stats.totalStudents}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-yellow-100 text-yellow-600">
              <FaCalendarCheck size={24} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Today's Attendance</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData.stats.todayAttendance}%</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-purple-100 text-purple-600">
              <FaBell size={24} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Tasks</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData.stats.pendingTasks}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-800">My Assigned Classes</h3>
            <div className="text-sm text-gray-600">
              {isToday(new Date()) ? "Today's Overview" : "Class Overview"}
            </div>
          </div>
          {dashboardData.assignedClasses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No classes assigned yet. Please contact administrator.
            </div>
          ) : (
            <div className="space-y-4">
              {dashboardData.assignedClasses.map((cls, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-gray-800 text-lg">
                          Class {cls.class}-{cls.section}
                        </h4>
                        {getAttendanceStatusBadge(cls.class, cls.section)}
                      </div>
                      <p className="text-gray-600">
                        {user?.teacherProfile?.subjects?.[0] || 'Subject'}
                      </p>
                      <div className="flex items-center mt-2 text-sm text-gray-500">
                        <FaUsers className="mr-2" />
                        <span>{cls.studentCount} students</span>
                        <FaClock className="ml-4 mr-2" />
                        <span>8:00 AM - 9:00 AM</span>
                      </div>
                      <div className="mt-2">
                        <span className={`px-3 py-1 rounded-full text-sm ${
                          cls.attendancePercentage >= 90 ? 'bg-green-100 text-green-800' :
                          cls.attendancePercentage >= 75 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          Today's Attendance: {cls.attendancePercentage}%
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col space-y-2 ml-4">
                      <button 
                        className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 flex items-center justify-center min-w-[140px]"
                        onClick={() => handleTakeAttendance(cls.class, cls.section)}
                      >
                        <FaCalendarCheck className="mr-2" />
                        Take Attendance
                      </button>
                      <button 
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center justify-center min-w-[140px]"
                        onClick={() => handleViewStudents(cls.class, cls.section)}
                      >
                        <FaUsers className="mr-2" />
                        View Students
                      </button>
                      <button 
                        className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 flex items-center justify-center min-w-[140px]"
                        onClick={() => handleGenerateReport(cls.class, cls.section)}
                      >
                        <FaFileExport className="mr-2" />
                        Generate Report
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-800">Today's Schedule</h3>
            <FaCalendarAlt className="text-gray-500" />
          </div>
          {dashboardData.todaySchedule.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No classes scheduled today
            </div>
          ) : (
            <div className="space-y-4">
              {dashboardData.todaySchedule.map((cls, index) => (
                <div key={index} className="p-3 border border-gray-200 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium text-gray-800">
                        Class {cls.class}-{cls.section}
                      </h4>
                      <p className="text-sm text-gray-600">{cls.time}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-gray-800">{cls.time}</div>
                      <div className={`text-xs px-2 py-1 rounded-full ${
                        index === 0 ? 'bg-green-100 text-green-800' :
                        index === 1 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {index === 0 ? 'Ongoing' : index === 1 ? 'Upcoming' : 'Later'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-bold text-gray-800">Today's Attendance Summary</h4>
              <button 
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                onClick={() => navigate('/teacher/attendance')}
              >
                <FaCalendarCheck className="mr-1" />
                View All
              </button>
            </div>
            {dashboardData.classStats.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                No attendance data available
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {dashboardData.classStats.reduce((sum, cls) => sum + cls.todayPresent, 0)}
                    </div>
                    <div className="text-sm text-gray-600">Total Present</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {dashboardData.classStats.reduce((sum, cls) => sum + cls.todayAbsent, 0)}
                    </div>
                    <div className="text-sm text-gray-600">Total Absent</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {dashboardData.classStats.map((cls, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span className="text-gray-700">Class {cls.className}-{cls.section}</span>
                      <div className="flex items-center">
                        <span className={`font-medium ${
                          cls.attendancePercentage >= 90 ? 'text-green-600' :
                          cls.attendancePercentage >= 75 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {cls.attendancePercentage}%
                        </span>
                        <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              cls.attendancePercentage >= 90 ? 'bg-green-500' :
                              cls.attendancePercentage >= 75 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(cls.attendancePercentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Upcoming Events</h3>
          <div className="space-y-3">
            {dashboardData.upcomingEvents.map((event) => (
              <div key={event.id} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg mr-3">
                  <FaCalendarCheck />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-800">{event.title}</h4>
                  <p className="text-sm text-gray-600">Class: {event.class}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-800">{event.date}</div>
                  <div className="text-xs text-gray-500">Reminder</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Recent Activities</h3>
          <div className="space-y-3">
            {dashboardData.recentActivities.map((activity) => (
              <div key={activity.id} className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                <p className="text-gray-800">{activity.action}</p>
                <p className="text-sm text-gray-500 mt-1">{activity.time}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800">Quick Statistics</h3>
          <div className="text-sm text-gray-500">
            Updated: {format(new Date(), 'hh:mm a')}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <FaChartLine className="text-2xl text-blue-600 mx-auto mb-2" />
            <div className="text-lg font-bold text-gray-800">{dashboardData.stats.todayAttendance}%</div>
            <div className="text-sm text-gray-600">Attendance Avg</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <FaUsers className="text-2xl text-green-600 mx-auto mb-2" />
            <div className="text-lg font-bold text-gray-800">{dashboardData.stats.totalStudents}</div>
            <div className="text-sm text-gray-600">Active Students</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <FaExclamationTriangle className="text-2xl text-yellow-600 mx-auto mb-2" />
            <div className="text-lg font-bold text-gray-800">{dashboardData.stats.pendingTasks}</div>
            <div className="text-sm text-gray-600">Pending Tasks</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <FaChalkboardTeacher className="text-2xl text-purple-600 mx-auto mb-2" />
            <div className="text-lg font-bold text-gray-800">{dashboardData.stats.totalClasses}</div>
            <div className="text-sm text-gray-600">Assigned Classes</div>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <button 
          className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 flex items-center"
          onClick={() => navigate('/teacher/attendance')}
        >
          <FaCalendarCheck className="mr-2" />
          Manage Attendance
        </button>
        <button 
          className="px-4 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-50 flex items-center"
          onClick={() => navigate('/teacher/students')}
        >
          <FaUsers className="mr-2" />
          View All Students
        </button>
      </div>
    </div>
  );
};

export default TeacherDashboard;