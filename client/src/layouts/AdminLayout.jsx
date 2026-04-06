import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  FaTachometerAlt, FaUsers, FaChalkboardTeacher, FaCalendarAlt, 
  FaMoneyBillWave, FaCreditCard, FaChartBar, FaUtensils, 
  FaBox, FaCog, FaSignOutAlt, FaBars, FaTimes, FaUserCircle,
  FaSchool, FaBell, FaSearch, FaGraduationCap // ADD FaGraduationCap HERE
} from 'react-icons/fa';
import { Toaster } from 'react-hot-toast';

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileDropdown, setProfileDropdown] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const adminMenu = [
  { path: '/admin/dashboard', icon: <FaTachometerAlt />, label: 'Dashboard' },
  { path: '/admin/students', icon: <FaUsers />, label: 'Students' },
  { path: '/admin/teachers', icon: <FaChalkboardTeacher />, label: 'Teachers' },
  { path: '/admin/exams', icon: <FaGraduationCap />, label: 'Exams' }, // ADD THIS LINE
  { path: '/admin/attendance', icon: <FaCalendarAlt />, label: 'Attendance' },
  { path: '/admin/fees', icon: <FaMoneyBillWave />, label: 'Fees' },
  { path: '/admin/payments', icon: <FaCreditCard />, label: 'Payments' },
  { path: '/admin/reports', icon: <FaChartBar />, label: 'Reports' },
  { path: '/admin/canteen', icon: <FaUtensils />, label: 'Canteen' },
  { path: '/admin/inventory', icon: <FaBox />, label: 'Inventory' },
  { path: '/admin/settings', icon: <FaCog />, label: 'Settings' },
];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Toaster position="top-right" />
      
      {/* Top Navigation Bar */}
      <nav className="bg-white shadow-md">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Left side - Logo and toggle */}
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 lg:hidden"
              >
                {sidebarOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
              </button>
              
              <div className="flex items-center ml-4 lg:ml-0">
                <FaSchool className="h-8 w-8 text-school-blue" />
                <div className="ml-3">
                  <h1 className="text-xl font-bold text-gray-900">Oxford Grammar School</h1>
                  <p className="text-sm text-gray-500">Admin Panel</p>
                </div>
              </div>
            </div>

            {/* Right side - Search and Profile */}
            <div className="flex items-center space-x-4">
              {/* Search Bar */}
              <div className="hidden md:block relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaSearch className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="search"
                  placeholder="Search..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-school-blue focus:border-transparent w-64"
                />
              </div>

              {/* Notifications */}
              <button className="relative p-2 text-gray-400 hover:text-gray-500">
                <FaBell size={20} />
                <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-400"></span>
              </button>

              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setProfileDropdown(!profileDropdown)}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100"
                >
                  <div className="flex items-center">
                    <FaUserCircle className="h-8 w-8 text-gray-400" />
                    <div className="ml-3 text-left hidden md:block">
                      <p className="text-sm font-medium text-gray-700">{user?.name}</p>
                      <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                    </div>
                  </div>
                </button>

                {profileDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 border border-gray-200">
                    <div className="px-4 py-2 border-b">
                      <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                    </div>
                    <Link
                      to="/admin/settings"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setProfileDropdown(false)}
                    >
                      Profile Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    >
                      <FaSignOutAlt className="mr-2" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:flex lg:flex-shrink-0`}>
          <div className="flex flex-col h-full">
            {/* Sidebar Menu */}
            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
              {adminMenu.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                      isActive
                        ? 'bg-school-blue text-white'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                    onClick={() => window.innerWidth < 1024 && setSidebarOpen(false)}
                  >
                    <span className="mr-3">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Sidebar Footer */}
            <div className="px-4 py-4 border-t border-gray-200">
              <div className="flex items-center">
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700">Quick Actions</p>
                  <p className="text-xs text-gray-500">Last login: {user?.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Today'}</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
};

export default AdminLayout;