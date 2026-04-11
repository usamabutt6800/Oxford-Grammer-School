// client/src/pages/admin/Dashboard.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FaUsers, FaChalkboardTeacher, FaMoneyBillWave, FaCalendarAlt,
  FaChartLine, FaSchool, FaArrowUp,
  FaUserGraduate, FaUtensils,
  FaBox, FaSpinner, FaSync, FaExclamationTriangle,
  FaCreditCard, FaCoffee, FaClipboardList, FaUserTie, FaFileInvoiceDollar
} from 'react-icons/fa';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  ArcElement, Title, Tooltip, Legend,
} from 'chart.js';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const PKRIcon = ({ className, size }) => (
  <span className={className} style={{ fontSize: size }}>Rs.</span>
);

// Activity type config
const ACTIVITY_CONFIG = {
  admission:  { color: 'bg-green-100',  icon: <FaUserGraduate className="text-green-600" /> },
  teacher:    { color: 'bg-blue-100',   icon: <FaUserTie className="text-blue-600" /> },
  payment:    { color: 'bg-purple-100', icon: <FaMoneyBillWave className="text-purple-600" /> },
  fee:        { color: 'bg-orange-100', icon: <FaFileInvoiceDollar className="text-orange-600" /> },
  attendance: { color: 'bg-yellow-100', icon: <FaCalendarAlt className="text-yellow-600" /> },
};

const AdminDashboard = () => {
  const { api } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    students:   { total: 0, active: 0, newThisMonth: 0, classDistribution: [] },
    teachers:   { total: 0, active: 0, newThisMonth: 0 },
    attendance: { today: 0, average: 0, present: 0, absent: 0, leave: 0 },
    fees:       { collected: 0, pending: 0, collectionRate: 0 },
    canteen:    { todaySales: 0, todayItems: 0, monthSales: 0, lowStock: 0, profit: 0 },
    inventory:  { totalItems: 0, lowStock: 0, outOfStock: 0, totalValue: 0 },
  });

  // Activity log state — infinite scroll
  const [activities, setActivities]         = useState([]);
  const [actPage, setActPage]               = useState(1);
  const [actHasMore, setActHasMore]         = useState(true);
  const [actLoading, setActLoading]         = useState(false);
  const activityRef = useRef(null);

  const formatPKR = (amount) => `Rs. ${(amount || 0).toLocaleString('en-PK')}`;

  // ── Fetch activity log page ──────────────────────────────────────
  const fetchActivities = useCallback(async (page = 1, append = false) => {
    try {
      setActLoading(true);
      const res = await api().get('/dashboard/activity', { params: { page, limit: 20 } });
      if (res.data.success) {
        setActivities(prev => append ? [...prev, ...res.data.data] : res.data.data);
        setActHasMore(res.data.hasMore);
        setActPage(page);
      }
    } catch {
      // silently fail — not critical
    } finally {
      setActLoading(false);
    }
  }, [api]);

  // ── Infinite scroll observer ────────────────────────────────────
  useEffect(() => {
    if (!activityRef.current) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && actHasMore && !actLoading) {
          fetchActivities(actPage + 1, true);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(activityRef.current);
    return () => observer.disconnect();
  }, [actHasMore, actLoading, actPage, fetchActivities]);

  // ── Fetch stats ─────────────────────────────────────────────────
  const fetchDashboardData = useCallback(async () => {
    const axiosInstance = api();
    try {
      setLoading(true);
      const [studentStats, teacherStats, attendanceRes, feesRes, canteenRes, inventoryRes] = await Promise.all([
        axiosInstance.get('/students/stats/summary').catch(() => ({ data: { success: false } })),
        axiosInstance.get('/teachers/stats').catch(() => ({ data: { success: false } })),
        axiosInstance.get('/attendance/stats').catch(() => ({ data: { success: false } })),
        axiosInstance.get('/fees/stats/summary').catch(() => ({ data: { success: false } })),
        axiosInstance.get('/canteen/stats').catch(() => ({ data: { success: false } })),
        axiosInstance.get('/inventory/stats').catch(() => ({ data: { success: false } })),
      ]);

      const attData = attendanceRes.data?.data;
      const feeData = feesRes.data?.data;
      const canData = canteenRes.data?.data;
      const invData = inventoryRes.data?.data;

      setDashboardData({
        students: {
          total:             studentStats.data?.data?.summary?.total || 0,
          active:            studentStats.data?.data?.summary?.active || 0,
          newThisMonth:      studentStats.data?.data?.summary?.newThisMonth || 0,
          classDistribution: studentStats.data?.data?.classDistribution || [],
        },
        teachers: {
          total:        teacherStats.data?.data?.total || 0,
          active:       teacherStats.data?.data?.active || 0,
          newThisMonth: teacherStats.data?.data?.newThisMonth || 0,
        },
        attendance: {
          today:   attData?.today?.percentage || 0,
          average: attData?.month?.percentage || 0,
          present: attData?.today?.present || 0,
          absent:  attData?.today?.absent  || 0,
          leave:   attData?.today?.leave   || 0,
        },
        fees: {
          collected:      feeData?.totalPaid       || 0,
          pending:        feeData?.totalDue        || 0,
          collectionRate: feeData?.collectionRate  || 0,
        },
        canteen: {
          todaySales: canData?.today?.sales      || 0,
          todayItems: canData?.today?.itemsSold  || 0,
          monthSales: canData?.month?.sales      || 0,
          lowStock:   canData?.inventory?.lowStock || 0,
          profit:     canData?.today?.profit     || 0,
        },
        inventory: {
          totalItems:  invData?.summary?.totalItems  || 0,
          lowStock:    invData?.summary?.lowStock    || 0,
          outOfStock:  invData?.summary?.outOfStock  || 0,
          totalValue:  invData?.summary?.totalValue  || 0,
        },
      });
    } catch (error) {
      toast.error('Failed to load some dashboard data');
    } finally {
      setLoading(false);
    }
  }, [api]);

  const refreshData = async () => {
    setRefreshing(true);
    await Promise.all([fetchDashboardData(), fetchActivities(1, false)]);
    setRefreshing(false);
    toast.success('Dashboard refreshed');
  };

  useEffect(() => {
    fetchDashboardData();
    fetchActivities(1, false);
  }, [fetchDashboardData, fetchActivities]);

  // ── Chart data ──────────────────────────────────────────────────
  const feeChartData = {
    labels: ['Collected', 'Pending'],
    datasets: [{
      data: [dashboardData.fees.collected, dashboardData.fees.pending],
      backgroundColor: ['rgba(34,197,94,0.8)', 'rgba(239,68,68,0.6)'],
      borderRadius: 8, barPercentage: 0.6,
    }],
  };

  const classDistributionData = {
    labels: dashboardData.students.classDistribution.map(c =>
      c.class === 'Play Group' ? 'PG' : c.class === 'Nursery' ? 'Nur' : c.class === 'Prep' ? 'Prep' : `Cls ${c.class}`
    ),
    datasets: [{
      label: 'Students',
      data: dashboardData.students.classDistribution.map(c => c.count),
      backgroundColor: ['#3b82f6','#60a5fa','#93c5fd','#bfdbfe','#ef4444','#f87171','#fca5a5','#f59e0b','#fbbf24','#fcd34d','#34d399','#6ee7b7','#a7f3d0'],
      borderWidth: 0,
    }],
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
        <button onClick={refreshData} disabled={refreshing}
          className="mt-4 md:mt-0 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center transition">
          <FaSync className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Stats Row 1 */}
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
            <div className="p-3 bg-blue-100 rounded-full"><FaUsers className="text-2xl text-blue-600" /></div>
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
            <div className="p-3 bg-green-100 rounded-full"><FaChalkboardTeacher className="text-2xl text-green-600" /></div>
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
            <div className="p-3 bg-yellow-100 rounded-full"><FaCalendarAlt className="text-2xl text-yellow-600" /></div>
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
            <div className="p-3 bg-purple-100 rounded-full"><FaMoneyBillWave className="text-2xl text-purple-600" /></div>
          </div>
        </div>
      </div>

      {/* Stats Row 2 */}
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
            <div className="p-3 bg-orange-100 rounded-full"><FaUtensils className="text-2xl text-orange-600" /></div>
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
            <div className="p-3 bg-teal-100 rounded-full"><FaChartLine className="text-2xl text-teal-600" /></div>
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
            <div className="p-3 bg-indigo-100 rounded-full"><FaBox className="text-2xl text-indigo-600" /></div>
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

      {/* Charts + Class breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Fee Collection Overview</h3>
          <div className="h-64">
            <Bar data={feeChartData} options={{
              responsive: true, maintainAspectRatio: false,
              plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `Rs. ${ctx.raw.toLocaleString('en-PK')}` } } },
              scales: { y: { beginAtZero: true, ticks: { callback: (v) => 'Rs. ' + (v / 1000) + 'k' }, grid: { color: '#e5e7eb' } }, x: { grid: { display: false } } }
            }} />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Students per Class</h3>
          {dashboardData.students.classDistribution.length > 0 ? (
            <div className="h-64">
              <Doughnut data={classDistributionData} options={{
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'right', labels: { font: { size: 10 }, boxWidth: 10 } } }
              }} />
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              <p>No student data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Class breakdown + Activity log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Class-wise Breakdown</h3>
          {dashboardData.students.classDistribution.length > 0 ? (
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {dashboardData.students.classDistribution.map((item, index) => {
                const maxCount = Math.max(...dashboardData.students.classDistribution.map(c => c.count), 1);
                return (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">
                        {['Play Group','Nursery','Prep'].includes(item.class) ? item.class : `Class ${item.class}`}
                      </span>
                      <span className="text-sm font-bold text-gray-900">{item.count} students</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${(item.count / maxCount) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400"><p>No student data available</p></div>
          )}
        </div>

        {/* Activity log with infinite scroll */}
        <div className="bg-white rounded-xl shadow-sm p-5 flex flex-col">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activities</h3>
          <div className="flex-1 overflow-y-auto max-h-72 space-y-2 pr-1">
            {activities.length === 0 && !actLoading ? (
              <div className="text-center py-8 text-gray-400"><p>No activities yet</p></div>
            ) : (
              <>
                {activities.map((activity, index) => {
                  const config = ACTIVITY_CONFIG[activity.type] || ACTIVITY_CONFIG.admission;
                  return (
                    <div key={index}
                      className="flex items-start p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                      onClick={() => activity.link && navigate(activity.link)}>
                      <div className={`p-2 rounded-lg mr-3 flex-shrink-0 ${config.color}`}>
                        {config.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 leading-snug">{activity.action}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{activity.timeFormatted}</p>
                      </div>
                    </div>
                  );
                })}
                {/* Sentinel for infinite scroll */}
                <div ref={activityRef} className="py-2 text-center">
                  {actLoading && <FaSpinner className="animate-spin text-blue-500 mx-auto" />}
                  {!actHasMore && activities.length > 0 && (
                    <p className="text-xs text-gray-400">All activities loaded</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-3">
          {[
            { path: '/admin/students',   icon: <FaUserGraduate className="text-xl text-blue-600 mx-auto mb-2" />,        label: 'Students',   bg: 'bg-blue-50 hover:bg-blue-100' },
            { path: '/admin/teachers',   icon: <FaChalkboardTeacher className="text-xl text-green-600 mx-auto mb-2" />,  label: 'Teachers',   bg: 'bg-green-50 hover:bg-green-100' },
            { path: '/admin/fees',       icon: <FaMoneyBillWave className="text-xl text-purple-600 mx-auto mb-2" />,     label: 'Fees',       bg: 'bg-purple-50 hover:bg-purple-100' },
            { path: '/admin/payments',   icon: <FaCreditCard className="text-xl text-indigo-600 mx-auto mb-2" />,        label: 'Payments',   bg: 'bg-indigo-50 hover:bg-indigo-100' },
            { path: '/admin/attendance', icon: <FaClipboardList className="text-xl text-yellow-600 mx-auto mb-2" />,     label: 'Attendance', bg: 'bg-yellow-50 hover:bg-yellow-100' },
            { path: '/admin/canteen',    icon: <FaCoffee className="text-xl text-orange-600 mx-auto mb-2" />,            label: 'Canteen',    bg: 'bg-orange-50 hover:bg-orange-100' },
            { path: '/admin/inventory',  icon: <FaBox className="text-xl text-teal-600 mx-auto mb-2" />,                 label: 'Inventory',  bg: 'bg-teal-50 hover:bg-teal-100' },
          ].map(({ path, icon, label, bg }) => (
            <button key={path} onClick={() => navigate(path)}
              className={`p-3 ${bg} rounded-xl text-center transition group`}>
              {icon}
              <span className="text-xs text-gray-700">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
