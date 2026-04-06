import React, { useState } from 'react';
import { FaCog, FaSave, FaUserShield, FaSchool, FaCalendar, FaBell, FaLock } from 'react-icons/fa';
import toast from 'react-hot-toast';

const AdminSettings = () => {
  const [settings, setSettings] = useState({
    schoolName: 'Oxford Grammar School',
    schoolAddress: '123 Education Street, Karachi, Pakistan',
    phone: '+92 21 1234567',
    email: 'info@oxfordgrammar.edu.pk',
    academicYear: '2024-2025',
    feeDueDate: '10',
    attendanceThreshold: '75',
    notificationEnabled: true,
    autoBackup: true,
  });

  const handleSave = () => {
    toast.success('Settings saved successfully!');
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-600">Configure school system settings</p>
        </div>
        <button 
          className="btn-primary flex items-center mt-4 md:mt-0"
          onClick={handleSave}
        >
          <FaSave className="mr-2" />
          Save Settings
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* School Information */}
        <div className="card lg:col-span-2">
          <div className="flex items-center mb-6">
            <FaSchool className="text-2xl text-school-blue mr-3" />
            <h3 className="text-xl font-bold text-gray-800">School Information</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                School Name
              </label>
              <input
                type="text"
                className="input-field"
                value={settings.schoolName}
                onChange={(e) => handleChange('schoolName', e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                School Address
              </label>
              <textarea
                rows="3"
                className="input-field"
                value={settings.schoolAddress}
                onChange={(e) => handleChange('schoolAddress', e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={settings.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  className="input-field"
                  value={settings.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Academic Settings */}
        <div className="card">
          <div className="flex items-center mb-6">
            <FaCalendar className="text-2xl text-school-blue mr-3" />
            <h3 className="text-xl font-bold text-gray-800">Academic Settings</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Academic Year
              </label>
              <input
                type="text"
                className="input-field"
                value={settings.academicYear}
                onChange={(e) => handleChange('academicYear', e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fee Due Date (Day of Month)
              </label>
              <input
                type="number"
                min="1"
                max="31"
                className="input-field"
                value={settings.feeDueDate}
                onChange={(e) => handleChange('feeDueDate', e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Attendance Threshold (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                className="input-field"
                value={settings.attendanceThreshold}
                onChange={(e) => handleChange('attendanceThreshold', e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* System Preferences */}
      <div className="card">
        <div className="flex items-center mb-6">
          <FaCog className="text-2xl text-school-blue mr-3" />
          <h3 className="text-xl font-bold text-gray-800">System Preferences</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center">
                <FaBell className="text-gray-400 mr-3" />
                <div>
                  <h4 className="font-medium text-gray-800">Email Notifications</h4>
                  <p className="text-sm text-gray-600">Send email alerts for important events</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.notificationEnabled}
                  onChange={(e) => handleChange('notificationEnabled', e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-school-blue"></div>
              </label>
            </div>
          </div>
          
          <div>
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center">
                <FaLock className="text-gray-400 mr-3" />
                <div>
                  <h4 className="font-medium text-gray-800">Auto Backup</h4>
                  <p className="text-sm text-gray-600">Automatic daily database backup</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.autoBackup}
                  onChange={(e) => handleChange('autoBackup', e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-school-blue"></div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Security Settings */}
      <div className="card">
        <div className="flex items-center mb-6">
          <FaUserShield className="text-2xl text-school-blue mr-3" />
          <h3 className="text-xl font-bold text-gray-800">Security Settings</h3>
        </div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Change Admin Password
              </label>
              <input
                type="password"
                className="input-field"
                placeholder="Enter new password"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                className="input-field"
                placeholder="Confirm new password"
              />
            </div>
          </div>
          
          <div className="p-4 bg-yellow-50 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> Password changes require current password verification. 
              After changing password, you will be logged out and need to login again.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;