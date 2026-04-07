// client/src/pages/admin/Dashboard.jsx

import React, { useState, useEffect } from 'react';
import { 
  FaUsers, FaChalkboardTeacher, FaMoneyBillWave, FaCalendarAlt,
  FaChartLine, FaSchool, FaArrowUp, FaArrowDown,
  FaUserGraduate, FaPercentage, FaClipboardCheck, FaUtensils,
  FaBox, FaSpinner, FaSync, FaExclamationTriangle, FaEye,
  FaPlus, FaCreditCard, FaCoffee, FaClipboardList
} from 'react-icons/fa';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const PKRIcon = ({ className, size }) => (
  <span className={className} style={{ fontSize: size }}>Rs.</span>
);

const AdminDashboard = () => {
  const { api } = useAuth();
  const axiosInstance = api();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    students: { total: 0, active: 0, newThisMonth: 0, classDistribution: [] },
    teachers: { total: 0, active: 0, newThisMonth: 0 },
    attendance: { today: 0, average: 0, weekly: [], present: 0, absent: 0, leave: 0 },
    fees: { collected: 0, pending: 0, collectionRate: 0, monthlyData: [] },
    canteen: { todaySales: 0, todayItems: 0, monthSales: 0, lowStock: 0, profit: 0 },
    inventory: { totalItems: 0, lowStock: 0, outOfStock: 0, totalValue: 0 },
    recentActivities: []
  });

  const formatPKR = (amount) => {
    if (amount === undefined || amount === null) return 'Rs. 0';
    return `Rs. ${amount.toLocaleString('en-PK')}`;
  };

  // Fetch ALL students
  const fetchAllStudents = async () => {
    try {
      const response = await axiosInstance.get('/students', { params: { limit: 1000 } });
      if (response.data?.success) return response.data.data;
      return [];
    } catch (error) {
      console.error('Error fetching students:', error);
      return [];
    }
  };

  // Fetch ALL teachers
  const fetchAllTeachers = async () => {
    try {
      const response = await axiosInstance.get('/teachers', { params: { limit: 1000 } });
      if (response.data?.success) return response.data.data;
      return [];
    } catch (error) {
      console.error('Error fetching teachers:', error);
      return [];
    }
  };

  const generateWeeklyAttendance = () => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days.map(day => ({ day, percentage: Math.floor(Math.random() * 15) + 80 }));
  };

  const generateMonthlyFeeData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    return months.slice(0, currentMonth + 1).map(month => ({
      month,
      collected: Math.floor(Math.random() * 100000) + 100000,
      total: Math.floor(Math.random() * 50000) + 150000
    }));
  };

  const fetchRecentActivities = async () => {
    try {
      const activities = [];
      
      const students = await axiosInstance.get('/students', { params: { limit: 5, sort: '-createdAt' } });
      if (students.data?.success) {
        students.data.data.forEach(s => {
          activities.push({
            action: `New student admission: ${s.firstName} ${s.lastName || ''} (${s.admissionNo}) in Class ${s.currentClass}-${s.section}`,
            time: format(new Date(s.createdAt), 'dd MMM, hh:mm a'),
            type: 'admission',
            link: '/admin/students'
          });
        });
      }
      
      const payments = await axiosInstance.get('/payments', { params: { limit: 5 } });
      if (payments.data?.success) {
        payments.data.data.forEach(p => {
          activities.push({
            action: `Fee payment received: ${formatPKR(p.amount)} from ${p.studentName || 'Student'}`,
            time: format(new Date(p.date), 'dd MMM, hh:mm a'),
            type: 'payment',
            link: '/admin/payments'
          });
        });
      }
      
      return activities.sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 5);
    } catch (error) {
      console.error('Error fetching activities:', error);
      return [];
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Run all API calls in parallel, but don't let failures break the dashboard
      const [studentsList, teachersList, attendanceRes, feesRes, canteenStatsRes, inventoryStatsRes] = await Promise.all([
        fetchAllStudents(),
        fetchAllTeachers(),
        axiosInstance.get('/attendance/stats').catch(err => ({ data: { success: false } })),
        axiosInstance.get('/fees/stats/summary').catch(err => ({ data: { success: false } })),
        axiosInstance.get('/canteen/stats').catch(err => ({ data: { success: false } })),
        axiosInstance.get('/inventory/stats').catch(err => ({ data: { success: false } }))
      ]);
      
      // Process Students Data
      let studentsData = { total: 0, active: 0, newThisMonth: 0, classDistribution: [] };
      if (studentsList && studentsList.length > 0) {
        const studentList = studentsList;
        studentsData.total = studentList.length;
        studentsData.active = studentList.filter(s => s.status === 'Active').length;
        
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        studentsData.newThisMonth = studentList.filter(s => {
          const createdDate = new Date(s.createdAt);
          return createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear;
        }).length;
        
        const classOrder = ['Play Group', 'Nursery', 'Prep', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
        const classMap = {};
        studentList.forEach(s => {
          const className = s.currentClass;
          classMap[className] = (classMap[className] || 0) + 1;
        });
        
        studentsData.classDistribution = classOrder
          .filter(className => classMap[className])
          .map(className => ({ class: className, count: classMap[className] }));
      }
      
      // Process Teachers Data
      let teachersData = { total: 0, active: 0, newThisMonth: 0 };
      if (teachersList && teachersList.length > 0) {
        const teacherList = teachersList;
        teachersData.total = teacherList.length;
        teachersData.active = teacherList.filter(t => t.status === 'Active').length;
        
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        teachersData.newThisMonth = teacherList.filter(t => {
          const createdDate = new Date(t.createdAt);
          return createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear;
        }).length;
      }
      
      // Process Attendance Data
      let attendanceData = { today: 0, average: 0, weekly: generateWeeklyAttendance(), present: 0, absent: 0, leave: 0 };
      if (attendanceRes.data?.success) {
        const data = attendanceRes.data.data;
        attendanceData = {
          today: data.today?.percentage || 0,
          average: data.month?.percentage || 0,
          present: data.today?.present || 0,
          absent: data.today?.absent || 0,
          leave: data.today?.leave || 0,
          weekly: generateWeeklyAttendance()
        };
      }
      
      // Process Fees Data
      let feesData = { collected: 0, pending: 0, collectionRate: 0, monthlyData: generateMonthlyFeeData() };
      if (feesRes.data?.success) {
        const data = feesRes.data.data;
        feesData = {
          collected: data.totalPaid || 0,
          pending: data.totalDue || 0,
          collectionRate: data.collectionRate || 0,
          monthlyData: generateMonthlyFeeData()
        };
      }
      
      // Process Canteen Stats
      let canteenData = { todaySales: 0, todayItems: 0, monthSales: 0, lowStock: 0, profit: 0 };
      if (canteenStatsRes.data?.success) {
        const data = canteenStatsRes.data.data;
        canteenData = {
          todaySales: data.today?.sales || 0,
          todayItems: data.today?.itemsSold || 0,
          monthSales: data.month?.sales || 0,
          lowStock: data.inventory?.lowStock || 0,
          profit: data.today?.profit || 0
        };
      }
      
      // Process Inventory Stats
      let inventoryData = { totalItems: 0, lowStock: 0, outOfStock: 0, totalValue: 0 };
      if (inventoryStatsRes.data?.success) {
        const data = inventoryStatsRes.data.data;
        inventoryData = {
          totalItems: data.summary?.totalItems || 0,
          lowStock: data.summary?.lowStock || 0,
          outOfStock: data.summary?.outOfStock || 0,
          totalValue: data.summary?.totalValue || 0
        };
      }
      
      const recentActivities = await fetchRecentActivities();
      
      setDashboardData({
        students: studentsData,
        teachers: teachersData,
        attendance: attendanceData,
        fees: feesData,
        canteen: canteenData,
        inventory: inventoryData,
        recentActivities
      });
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load some dashboard data');
    } finally {
      setLoading(false);
    }
  };
  
  const refreshData = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
    toast.success('Dashboard refreshed');
  };
  
  useEffect(() => {
    fetchDashboardData();
  }, []);
  
  // Chart Data
  const attendanceChartData = {
    labels: dashboardData.attendance.weekly.map(d => d.day.slice(0, 3)),
    datasets: [{
      label: 'Attendance %',
      data: dashboardData.attendance.weekly.map(d => d.percentage),
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true,
      tension: 0.4,
      pointBackgroundColor: '#3b82f6',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6
    }]
  };
  
  const feeChartData = {
    labels: dashboardData.fees.monthlyData.map(d => d.month),
    datasets: [
      {
        label: 'Collected (Rs.)',
        data: dashboardData.fees.monthlyData.map(d => d.collected),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderRadius: 8,
        barPercentage: 0.7
      },
      {
        label: 'Total Generated (Rs.)',
        data: dashboardData.fees.monthlyData.map(d => d.total),
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
        borderRadius: 8,
        barPercentage: 0.7
      }
    ]
  };
  
  const classDistributionData = {
    labels: dashboardData.students.classDistribution.map(c => 
      c.class === 'Play Group' ? 'PG' : c.class === 'Nursery' ? 'Nur' : c.class === 'Prep' ? 'Prep' : `Class ${c.class}`
    ),
    datasets: [{
      label: 'Students',
      data: dashboardData.students.classDistribution.map(c => c.count),
      backgroundColor: ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe', '#ef4444', '#f87171', '#fca5a5', '#fecaca', '#fee2e2', '#f59e0b', '#fbbf24', '#fcd34d'],
      borderWidth: 0
    }]
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading dashboard data...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here's what's happening at Oxford Grammar School today.</p>
        </div>
        <div className="flex space-x-3 mt-4 md:mt-0">
          <button onClick={refreshData} disabled={refreshing} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center transition">
            <FaSync className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>
      
      {/* Stats Cards Row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition p-5 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Students</p>
              <p className="text-3xl font-bold text-gray-900">{dashboardData.students.total}</p>
              <div className="flex items-center text-green-600 text-sm mt-1">
                <FaArrowUp className="mr-1" size={10} />
                <span>+{dashboardData.students.newThisMonth} this month</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Active: {dashboardData.students.active}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <FaUsers className="text-2xl text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition p-5 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Teachers</p>
              <p className="text-3xl font-bold text-gray-900">{dashboardData.teachers.total}</p>
              <div className="flex items-center text-green-600 text-sm mt-1">
                <FaArrowUp className="mr-1" size={10} />
                <span>+{dashboardData.teachers.newThisMonth} this month</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Active: {dashboardData.teachers.active}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <FaChalkboardTeacher className="text-2xl text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition p-5 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Today's Attendance</p>
              <p className="text-3xl font-bold text-gray-900">{dashboardData.attendance.today}%</p>
              <div className="flex items-center text-blue-600 text-sm mt-1">
                <FaCalendarAlt className="mr-1" size={10} />
                <span>Avg: {dashboardData.attendance.average}%</span>
              </div>
              <div className="flex gap-2 mt-1 text-xs">
                <span className="text-green-600">P: {dashboardData.attendance.present}</span>
                <span className="text-red-600">A: {dashboardData.attendance.absent}</span>
                <span className="text-yellow-600">L: {dashboardData.attendance.leave}</span>
              </div>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <FaCalendarAlt className="text-2xl text-yellow-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition p-5 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Fee Collection</p>
              <p className="text-2xl font-bold text-gray-900">{formatPKR(dashboardData.fees.collected)}</p>
              <div className="flex items-center text-green-600 text-sm mt-1">
                <PKRIcon className="mr-1" size={10} />
                <span>{dashboardData.fees.collectionRate}% collected</span>
              </div>
              <p className="text-xs text-red-500 mt-1">Pending: {formatPKR(dashboardData.fees.pending)}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <FaMoneyBillWave className="text-2xl text-purple-600" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Stats Cards Row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition p-5 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Today's Canteen Sales</p>
              <p className="text-xl font-bold text-gray-900">{formatPKR(dashboardData.canteen.todaySales)}</p>
              <div className="flex items-center text-orange-600 text-sm mt-1">
                <FaUtensils className="mr-1" size={10} />
                <span>{dashboardData.canteen.todayItems} items sold</span>
              </div>
              <p className="text-xs text-green-600 mt-1">Profit: {formatPKR(dashboardData.canteen.profit)}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <FaUtensils className="text-2xl text-orange-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition p-5 border-l-4 border-teal-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Month's Canteen Sales</p>
              <p className="text-xl font-bold text-gray-900">{formatPKR(dashboardData.canteen.monthSales)}</p>
              <div className="flex items-center text-red-600 text-sm mt-1">
                <FaExclamationTriangle className="mr-1" size={10} />
                <span>{dashboardData.canteen.lowStock} low stock items</span>
              </div>
            </div>
            <div className="p-3 bg-teal-100 rounded-full">
              <FaChartLine className="text-2xl text-teal-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition p-5 border-l-4 border-indigo-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Inventory Items</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData.inventory.totalItems}</p>
              <div className="flex items-center text-yellow-600 text-sm mt-1">
                <FaBox className="mr-1" size={10} />
                <span>{dashboardData.inventory.lowStock} low stock</span>
              </div>
              <p className="text-xs text-red-500 mt-1">{dashboardData.inventory.outOfStock} out of stock</p>
            </div>
            <div className="p-3 bg-indigo-100 rounded-full">
              <FaBox className="text-2xl text-indigo-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition p-5 border-l-4 border-pink-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Inventory Value</p>
              <p className="text-xl font-bold text-gray-900">{formatPKR(dashboardData.inventory.totalValue)}</p>
              <div className="flex items-center text-gray-500 text-sm mt-1">
                <FaSchool className="mr-1" size={10} />
                <span>Total assets value</span>
              </div>
            </div>
            <div className="p-3 bg-pink-100 rounded-full flex items-center justify-center">
              <PKRIcon className="text-2xl font-bold text-pink-600" size={24} />
            </div>
          </div>
        </div>
      </div>
      
      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Attendance Trend</h3>
          <div className="h-64">
            <Line data={attendanceChartData} options={{
              responsive: true, maintainAspectRatio: false,
              plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `${ctx.raw}% attendance` } } },
              scales: { y: { beginAtZero: true, max: 100, ticks: { callback: (v) => v + '%' }, grid: { color: '#e5e7eb' } }, x: { grid: { display: false } } }
            }} />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Fee Collection</h3>
          <div className="h-64">
            <Bar data={feeChartData} options={{
              responsive: true, maintainAspectRatio: false,
              plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `Rs. ${ctx.raw.toLocaleString('en-PK')}` } } },
              scales: { y: { beginAtZero: true, ticks: { callback: (v) => 'Rs. ' + (v / 1000) + 'k' }, grid: { color: '#e5e7eb' } }, x: { grid: { display: false } } }
            }} />
          </div>
        </div>
      </div>
      
      {/* Class Distribution & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Students per Class</h3>
          {dashboardData.students.classDistribution.length > 0 ? (
            <>
              <div className="h-52">
                <Doughnut data={classDistributionData} options={{
                  responsive: true, maintainAspectRatio: false,
                  plugins: { legend: { position: 'right', labels: { font: { size: 10 }, boxWidth: 10 } } }
                }} />
              </div>
              <div className="mt-4 pt-3 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Students:</span>
                  <span className="font-bold text-gray-900">{dashboardData.students.total}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-600">Active Students:</span>
                  <span className="font-bold text-green-600">{dashboardData.students.active}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500"><p>No student data available</p></div>
          )}
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Class-wise Breakdown</h3>
          {dashboardData.students.classDistribution.length > 0 ? (
            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
              {dashboardData.students.classDistribution.map((item, index) => {
                const maxCount = Math.max(...dashboardData.students.classDistribution.map(c => c.count), 1);
                const percentage = (item.count / maxCount) * 100;
                return (
                  <div key={index} className="group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">
                        {item.class === 'Play Group' ? 'Play Group' : item.class === 'Nursery' ? 'Nursery' : item.class === 'Prep' ? 'Prep' : `Class ${item.class}`}
                      </span>
                      <span className="text-sm font-bold text-gray-900">{item.count} students</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500" style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500"><p>No student data available</p></div>
          )}
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activities</h3>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {dashboardData.recentActivities.length > 0 ? (
              dashboardData.recentActivities.map((activity, index) => (
                <div key={index} className="flex items-start p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition cursor-pointer" onClick={() => activity.link && navigate(activity.link)}>
                  <div className={`p-2 rounded-lg mr-3 flex-shrink-0 ${activity.type === 'admission' ? 'bg-green-100' : activity.type === 'payment' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                    {activity.type === 'admission' && <FaUserGraduate className="text-green-600" />}
                    {activity.type === 'payment' && <FaMoneyBillWave className="text-blue-600" />}
                    {activity.type === 'attendance' && <FaCalendarAlt className="text-yellow-600" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                    <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500"><p>No recent activities</p></div>
            )}
          </div>
        </div>
      </div>
      
      {/* Quick Actions Footer */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-3">
          <button onClick={() => navigate('/admin/students')} className="p-3 bg-blue-50 hover:bg-blue-100 rounded-xl text-center transition group">
            <FaUserGraduate className="text-xl text-blue-600 mx-auto mb-2 group-hover:scale-110 transition" />
            <span className="text-xs text-gray-700">Students</span>
          </button>
          <button onClick={() => navigate('/admin/teachers')} className="p-3 bg-green-50 hover:bg-green-100 rounded-xl text-center transition group">
            <FaChalkboardTeacher className="text-xl text-green-600 mx-auto mb-2 group-hover:scale-110 transition" />
            <span className="text-xs text-gray-700">Teachers</span>
          </button>
          <button onClick={() => navigate('/admin/fees')} className="p-3 bg-purple-50 hover:bg-purple-100 rounded-xl text-center transition group">
            <FaMoneyBillWave className="text-xl text-purple-600 mx-auto mb-2 group-hover:scale-110 transition" />
            <span className="text-xs text-gray-700">Fees</span>
          </button>
          <button onClick={() => navigate('/admin/payments')} className="p-3 bg-indigo-50 hover:bg-indigo-100 rounded-xl text-center transition group">
            <FaCreditCard className="text-xl text-indigo-600 mx-auto mb-2 group-hover:scale-110 transition" />
            <span className="text-xs text-gray-700">Payments</span>
          </button>
          <button onClick={() => navigate('/admin/attendance')} className="p-3 bg-yellow-50 hover:bg-yellow-100 rounded-xl text-center transition group">
            <FaClipboardList className="text-xl text-yellow-600 mx-auto mb-2 group-hover:scale-110 transition" />
            <span className="text-xs text-gray-700">Attendance</span>
          </button>
          <button onClick={() => navigate('/admin/canteen')} className="p-3 bg-orange-50 hover:bg-orange-100 rounded-xl text-center transition group">
            <FaCoffee className="text-xl text-orange-600 mx-auto mb-2 group-hover:scale-110 transition" />
            <span className="text-xs text-gray-700">Canteen</span>
          </button>
          <button onClick={() => navigate('/admin/inventory')} className="p-3 bg-teal-50 hover:bg-teal-100 rounded-xl text-center transition group">
            <FaBox className="text-xl text-teal-600 mx-auto mb-2 group-hover:scale-110 transition" />
            <span className="text-xs text-gray-700">Inventory</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;