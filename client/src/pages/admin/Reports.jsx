import React from 'react';
import { 
  FaFilePdf, FaFileExcel, FaPrint, FaDownload, 
  FaChartBar, FaUsers, FaMoneyBillWave, FaGraduationCap,
  FaCalendarAlt, FaUserGraduate, FaSchool
} from 'react-icons/fa';

const AdminReports = () => {
  const reports = [
    { id: 1, name: 'Student Attendance Report', icon: <FaUsers />, desc: 'Daily, weekly, and monthly attendance reports', frequency: 'Daily' },
    { id: 2, name: 'Fee Collection Report', icon: <FaMoneyBillWave />, desc: 'Fee collection and pending dues report', frequency: 'Monthly' },
    { id: 3, name: 'Academic Performance', icon: <FaGraduationCap />, desc: 'Student exam results and performance analysis', frequency: 'Term-wise' },
    { id: 4, name: 'Teacher Performance', icon: <FaChartBar />, desc: 'Teacher attendance and class reports', frequency: 'Monthly' },
    { id: 5, name: 'Financial Summary', icon: <FaMoneyBillWave />, desc: 'Complete financial statements and summaries', frequency: 'Monthly' },
    { id: 6, name: 'Student Strength Report', icon: <FaUserGraduate />, desc: 'Class-wise and section-wise student count', frequency: 'Quarterly' },
    { id: 7, name: 'Inventory Report', icon: <FaSchool />, desc: 'School inventory and asset management report', frequency: 'Monthly' },
    { id: 8, name: 'Academic Calendar', icon: <FaCalendarAlt />, desc: 'School events and academic schedule', frequency: 'Yearly' },
  ];

  const quickReports = [
    { name: 'Today\'s Attendance Summary', type: 'PDF', size: '1.2 MB' },
    { name: 'Monthly Fee Collection', type: 'Excel', size: '2.5 MB' },
    { name: 'Student List - Class 10', type: 'PDF', size: '0.8 MB' },
    { name: 'Teacher Attendance - Jan 2024', type: 'Excel', size: '1.5 MB' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600">Generate and view various school reports</p>
        </div>
        <div className="flex space-x-3 mt-4 md:mt-0">
          <button className="btn-secondary flex items-center">
            <FaPrint className="mr-2" />
            Print
          </button>
          <button className="btn-primary flex items-center">
            <FaDownload className="mr-2" />
            Export All
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {reports.map(report => (
          <div key={report.id} className="card hover:shadow-lg transition-shadow">
            <div className="text-school-blue mb-4 text-2xl">{report.icon}</div>
            <h3 className="font-bold text-gray-800 mb-2">{report.name}</h3>
            <p className="text-sm text-gray-600 mb-3">{report.desc}</p>
            <div className="flex justify-between items-center">
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                {report.frequency}
              </span>
              <button className="text-sm text-blue-600 hover:text-blue-800 flex items-center">
                <FaFilePdf className="mr-1" />
                Generate
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Recently Generated Reports</h3>
          <div className="space-y-3">
            {quickReports.map((report, index) => (
              <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-800">{report.name}</h4>
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="mr-4">{report.type}</span>
                    <span>{report.size}</span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button className="p-2 text-blue-600 hover:bg-blue-50 rounded">
                    <FaDownload />
                  </button>
                  <button className="p-2 text-green-600 hover:bg-green-50 rounded">
                    <FaPrint />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Quick Analytics</h3>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-2xl font-bold text-gray-800">94%</div>
                  <div className="text-sm text-gray-600">Average Attendance</div>
                </div>
                <FaChartBar className="text-3xl text-blue-600" />
              </div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-2xl font-bold text-gray-800">Rs. 2.8M</div>
                  <div className="text-sm text-gray-600">Monthly Collection</div>
                </div>
                <FaMoneyBillWave className="text-3xl text-green-600" />
              </div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-2xl font-bold text-gray-800">1520</div>
                  <div className="text-sm text-gray-600">Total Students</div>
                </div>
                <FaUsers className="text-3xl text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminReports;