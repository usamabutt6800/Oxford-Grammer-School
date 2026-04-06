import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  FaSearch, FaFilter, FaPlus, FaEdit, FaTrash, FaEye, 
  FaPrint, FaDownload, FaChalkboardTeacher, FaSort, FaSortUp, FaSortDown,
  FaPhone, FaEnvelope, FaUserGraduate, FaCalendar, FaSpinner,
  FaArrowLeft, FaArrowRight, FaMoneyBillWave, FaUserTie, FaBookOpen
} from 'react-icons/fa';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { teacherService } from '../../services/teacherService';
import { exportToPDF, exportToCSV, printTeachers } from '../../utils/teacherExportUtils';

const AdminTeachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);
  const searchTimeoutRef = useRef(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    masters: 0,
    assignments: 0,
    totalSalary: 0
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    qualification: '',
    experience: ''
  });
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  });
  
  const [sortConfig, setSortConfig] = useState({ key: 'firstName', direction: 'asc' });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [activeTab, setActiveTab] = useState('personal');
  const [requireCurrentPassword, setRequireCurrentPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: 'Teacher@123',
    confirmPassword: '',
    qualification: '',
    specialization: '',
    experience: 0,
    salary: '',
    designation: 'Teacher',
    dateOfBirth: '',
    joiningDate: new Date().toISOString().split('T')[0], // ADDED: Joining Date field
    gender: 'Male',
    cnic: '',
    address: {
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'Pakistan'
    },
    subjects: [],
    assignedClasses: []
  });

  const qualifications = ['B.Ed', 'M.Ed', 'M.A', 'M.Sc', 'PhD', 'Other'];
  const designations = ['Head Teacher', 'Senior Teacher', 'Teacher', 'Assistant Teacher'];
  const experienceLevels = ['0-2', '3-5', '6-10', '10+'];
  const allSubjects = [
    'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Urdu', 
    'Pakistan Studies', 'Islamiyat', 'Computer Science', 'Art', 
    'Music', 'Physical Education', 'General Knowledge', 'Literature'
  ];
  
  const classLevels = ['Play Group', 'Nursery', 'Prep', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
  const sections = ['A', 'B', 'C', 'D'];

  // Fetch teachers
  useEffect(() => {
    fetchTeachers();
    fetchStats();
  }, [pagination.page, filters, searchTerm, sortConfig]);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
        search: searchTerm,
        sort: sortConfig.key,
        order: sortConfig.direction
      };

      const response = await teacherService.getTeachers(params);
      
      if (response.success) {
        setTeachers(response.data);
        setPagination({
          page: response.currentPage || 1,
          limit: pagination.limit,
          total: response.total || 0,
          totalPages: response.totalPages || 1
        });
      }
    } catch (error) {
      console.error('Error fetching teachers:', error);
      toast.error(error.response?.data?.error || 'Failed to fetch teachers');
      setTeachers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await teacherService.getTeacherStats();
      
      if (response.success) {
        const statsData = response.data.summary || {};
        const mastersCount = teachers.filter(t => 
          t.qualification?.includes('M.') || t.qualification?.includes('PhD')
        ).length;
        
        const assignmentsCount = teachers.reduce((sum, teacher) => 
          sum + (teacher.assignedClasses?.length || 0), 0
        );
        
        setStats({
          total: statsData.total || 0,
          active: statsData.active || 0,
          masters: mastersCount,
          assignments: assignmentsCount,
          totalSalary: statsData.totalSalary || 0
        });
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  // UPDATED: Enhanced print function to fetch ALL teachers
  const handlePrint = async () => {
    try {
      toast.loading('Preparing faculty list for printing...');
      
      // Fetch ALL teachers without pagination limits
      const response = await teacherService.getTeachers({
        ...filters,
        search: searchTerm,
        page: 1,
        limit: 1000, // Large number to get all teachers
        sort: sortConfig.key,
        order: sortConfig.direction
      });
      
      toast.dismiss();
      
      if (response.success && response.data.length > 0) {
        printTeachers(response.data);
        toast.success(`Printing ${response.data.length} teachers`);
      } else {
        toast.error('No teachers found to print');
      }
    } catch (error) {
      toast.dismiss();
      console.error('Error fetching all teachers for print:', error);
      toast.error('Failed to fetch teachers for printing');
    }
  };

  const handleAddTeacher = async (e) => {
    e.preventDefault();
    
    // Validate passwords
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }
    
    // Check if email already exists in current teachers list
    const emailExists = teachers.some(t => 
      t.email.toLowerCase() === formData.email.toLowerCase()
    );
    if (emailExists) {
      toast.error('A teacher with this email already exists');
      return;
    }
    
    try {
      // Prepare data for backend
      const teacherData = {
        ...formData,
        experience: parseInt(formData.experience) || 0,
        salary: parseFloat(formData.salary) || 0,
        password: formData.password // Send password to backend
      };

      // Remove confirmPassword before sending
      delete teacherData.confirmPassword;

      const response = await teacherService.createTeacher(teacherData);
      
      if (response.success) {
        toast.success('Teacher added successfully!');
        setShowAddModal(false);
        fetchTeachers();
        fetchStats();
        
        // Reset form
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          password: 'Teacher@123',
          confirmPassword: '',
          qualification: '',
          specialization: '',
          experience: 0,
          salary: '',
          designation: 'Teacher',
          dateOfBirth: '',
          joiningDate: new Date().toISOString().split('T')[0], // Reset to today
          gender: 'Male',
          cnic: '',
          address: {
            street: '',
            city: '',
            state: '',
            postalCode: '',
            country: 'Pakistan'
          },
          subjects: [],
          assignedClasses: []
        });
      } else {
        toast.error(response.error || 'Failed to add teacher');
      }
    } catch (error) {
      console.error('Error adding teacher:', error);
      toast.error(error.response?.data?.error || 'Failed to add teacher');
    }
  };

  const handleUpdateTeacher = async (e) => {
    e.preventDefault();
    if (!selectedTeacher) return;
    
    try {
      // Validate passwords if being changed
      if (selectedTeacher.password || selectedTeacher.confirmPassword) {
        if (selectedTeacher.password !== selectedTeacher.confirmPassword) {
          toast.error('Passwords do not match');
          return;
        }
        if (selectedTeacher.password && selectedTeacher.password.length < 6) {
          toast.error('Password must be at least 6 characters long');
          return;
        }
      }

      // Prepare update data
      const updateData = {
        ...selectedTeacher,
        // Only include password if provided
        password: selectedTeacher.password || undefined,
        currentPassword: requireCurrentPassword ? currentPassword : undefined
      };

      // Remove confirmPassword before sending
      delete updateData.confirmPassword;

      const response = await teacherService.updateTeacher(selectedTeacher._id, updateData);
      if (response.success) {
        toast.success('Teacher updated successfully!');
        setShowEditModal(false);
        setRequireCurrentPassword(false);
        setCurrentPassword('');
        setActiveTab('personal');
        fetchTeachers();
        fetchStats();
      } else {
        toast.error(response.error || 'Failed to update teacher');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update teacher');
    }
  };

  const handleDeleteTeacher = async (id) => {
    const teacher = teachers.find(t => t._id === id);
    if (!teacher) return;
    
    if (!window.confirm(`Are you sure you want to PERMANENTLY delete ${teacher.firstName} ${teacher.lastName || ''}?\n\nThis will: \n• Delete teacher profile permanently \n• Remove teacher from User model \n• Teacher will no longer be able to login\n\nThis action cannot be undone!`)) return;
    
    try {
      const response = await teacherService.deleteTeacher(id);
      if (response.success) {
        toast.success('Teacher deleted permanently from system!');
        fetchTeachers();
        fetchStats();
      } else {
        toast.error(response.error || 'Failed to delete teacher');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete teacher');
    }
  };

  const handleAssignClasses = async (teacherId, classesToAssign) => {
    try {
      const teacher = teachers.find(t => t._id === teacherId);
      if (!teacher) return;
      
      const updatedTeacher = {
        ...teacher,
        assignedClasses: classesToAssign
      };
      
      const response = await teacherService.updateTeacher(teacherId, updatedTeacher);
      if (response.success) {
        toast.success('Classes assigned successfully!');
        setShowAssignModal(false);
        fetchTeachers();
      } else {
        toast.error(response.error || 'Failed to assign classes');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to assign classes');
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setFormData({
        ...formData,
        address: {
          ...formData.address,
          [addressField]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const toggleSubject = (subject) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter(s => s !== subject)
        : [...prev.subjects, subject]
    }));
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination({ ...pagination, page: newPage });
    }
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <FaSort className="ml-1 text-gray-400" />;
    return sortConfig.direction === 'asc' 
      ? <FaSortUp className="ml-1 text-blue-600" /> 
      : <FaSortDown className="ml-1 text-blue-600" />;
  };

  const handleExport = (format = 'pdf') => {
    if (teachers.length === 0) {
      toast.error('No teachers to export');
      return;
    }
    
    if (format === 'pdf') {
      exportToPDF(teachers, 'Teacher List');
      toast.success('PDF exported successfully');
    } else if (format === 'csv') {
      exportToCSV(teachers, 'Teacher List');
      toast.success('CSV exported successfully');
    }
  };

  // Update stats when teachers change
  useEffect(() => {
    if (teachers.length > 0) {
      const mastersCount = teachers.filter(t => 
        t.qualification?.includes('M.') || t.qualification?.includes('PhD')
      ).length;
      
      const assignmentsCount = teachers.reduce((sum, teacher) => 
        sum + (teacher.assignedClasses?.length || 0), 0
      );
      
      const activeCount = teachers.filter(t => t.status === 'Active').length;
      const totalSalary = teachers.reduce((sum, teacher) => sum + (teacher.salary || 0), 0);
      
      setStats(prev => ({
        ...prev,
        total: teachers.length,
        active: activeCount,
        masters: mastersCount,
        assignments: assignmentsCount,
        totalSalary
      }));
    }
  }, [teachers]);

  if (loading && teachers.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <FaSpinner className="animate-spin text-4xl text-school-blue" />
        <span className="ml-3 text-lg">Loading teachers...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Teacher Management</h1>
          <p className="text-gray-600">Manage teacher profiles, assignments, and information</p>
        </div>
        <div className="flex space-x-3 mt-4 md:mt-0">
          <div className="relative group">
            <button 
              className="btn-secondary flex items-center"
              onClick={() => handleExport('pdf')}
            >
              <FaDownload className="mr-2" />
              Export
            </button>
            <div className="absolute hidden group-hover:block bg-white shadow-lg rounded-lg mt-1 w-32 z-10">
              <button 
                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                onClick={() => handleExport('pdf')}
              >
                Export as PDF
              </button>
              <button 
                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                onClick={() => handleExport('csv')}
              >
                Export as CSV
              </button>
            </div>
          </div>
          <button 
            className="btn-secondary flex items-center"
            onClick={handlePrint}
          >
            <FaPrint className="mr-2" />
            Print
          </button>
          <button 
            className="btn-primary flex items-center"
            onClick={() => setShowAddModal(true)}
          >
            <FaPlus className="mr-2" />
            Add Teacher
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
          <div className="text-sm text-gray-600">Total Teachers</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          <div className="text-sm text-gray-600">Active</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.masters}</div>
          <div className="text-sm text-gray-600">Masters Degree</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-purple-600">{stats.assignments}</div>
          <div className="text-sm text-gray-600">Class Assignments</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-red-600">
            PKR {stats.totalSalary.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Total Salary</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-2">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or employee ID..."
                className="input-field pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <select
            className="input-field"
            value={filters.status}
            onChange={(e) => setFilters({...filters, status: e.target.value})}
          >
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="On Leave">On Leave</option>
            <option value="Terminated">Terminated</option>
          </select>
          <select
            className="input-field"
            value={filters.qualification}
            onChange={(e) => setFilters({...filters, qualification: e.target.value})}
          >
            <option value="">All Qualifications</option>
            {qualifications.map(q => (
              <option key={q} value={q}>{q}</option>
            ))}
          </select>
        </div>
        <div className="mt-4 flex justify-between">
          <div className="flex items-center text-gray-600">
            <FaFilter className="mr-2" />
            <span>Showing {teachers.length} of {pagination.total} teachers</span>
          </div>
          <button 
            className="text-sm text-blue-600 hover:text-blue-800"
            onClick={() => setFilters({ status: '', qualification: '', experience: '' })}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Teachers Table */}
      <div className="card">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <FaSpinner className="animate-spin text-2xl text-school-blue" />
              <span className="ml-3">Loading...</span>
            </div>
          ) : teachers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No teachers found. Try adjusting your filters or add a new teacher.
            </div>
          ) : (
            <>
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      className="px-4 py-3 text-left font-semibold text-gray-700 cursor-pointer"
                      onClick={() => handleSort('employeeId')}
                    >
                      <div className="flex items-center">
                        Employee ID
                        {getSortIcon('employeeId')}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left font-semibold text-gray-700 cursor-pointer"
                      onClick={() => handleSort('firstName')}
                    >
                      <div className="flex items-center">
                        Teacher Name
                        {getSortIcon('firstName')}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Contact</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Qualification</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Classes</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map((teacher) => (
                    <tr key={teacher._id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{teacher.employeeId}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">
                          {teacher.firstName} {teacher.lastName || ''}
                        </div>
                        <div className="text-sm text-gray-600">
                          {teacher.subjects?.slice(0, 3).join(', ')}
                          {teacher.subjects?.length > 3 && '...'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {teacher.designation}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center text-gray-600 mb-1">
                          <FaPhone className="mr-2 text-sm" />
                          <span>{teacher.phone}</span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <FaEnvelope className="mr-2 text-sm" />
                          <span className="text-sm truncate max-w-[150px]">{teacher.email}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-800">{teacher.qualification}</div>
                        <div className="text-sm text-gray-600">{teacher.experience} years exp</div>
                        <div className="text-xs text-gray-500">{teacher.specialization}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {teacher.assignedClasses?.map((cls, idx) => (
                            <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                              {cls.class}-{cls.section}
                            </span>
                          ))}
                          {(!teacher.assignedClasses || teacher.assignedClasses.length === 0) && (
                            <span className="text-gray-400 text-sm">Not assigned</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className={`px-3 py-1 rounded-full text-sm ${
                            teacher.status === 'Active' ? 'bg-green-100 text-green-800' :
                            teacher.status === 'Inactive' ? 'bg-red-100 text-red-800' :
                            teacher.status === 'On Leave' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {teacher.status}
                          </span>
                          {teacher.joiningDate && (
                            <span className="text-xs text-gray-500">
                              <FaCalendar className="inline mr-1" />
                              Joined: {format(new Date(teacher.joiningDate), 'MMM yyyy')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex space-x-2">
                          <button 
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                            title="View"
                            onClick={() => {
                              setSelectedTeacher(teacher);
                              setShowViewModal(true);
                            }}
                          >
                            <FaEye />
                          </button>
                          <button 
                            className="p-2 text-green-600 hover:bg-green-50 rounded"
                            title="Edit"
                            onClick={() => {
                              setSelectedTeacher(teacher);
                              setShowEditModal(true);
                            }}
                          >
                            <FaEdit />
                          </button>
                          <button 
                            className="p-2 text-yellow-600 hover:bg-yellow-50 rounded"
                            title="Assign Classes"
                            onClick={() => {
                              setSelectedTeacher(teacher);
                              setShowAssignModal(true);
                            }}
                          >
                            <FaChalkboardTeacher />
                          </button>
                          <button 
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                            title="Delete"
                            onClick={() => handleDeleteTeacher(teacher._id)}
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    Page {pagination.page} of {pagination.totalPages} • Total {pagination.total} teachers
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className={`px-4 py-2 rounded flex items-center ${
                        pagination.page === 1
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      <FaArrowLeft className="mr-2" />
                      Previous
                    </button>
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.totalPages}
                      className={`px-4 py-2 rounded flex items-center ${
                        pagination.page === pagination.totalPages
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Next
                      <FaArrowRight className="ml-2" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add Teacher Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Add New Teacher</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-500 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <form onSubmit={handleAddTeacher}>
                <div className="space-y-6">
                  {/* Personal Details */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Personal Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          First Name *
                        </label>
                        <input
                          type="text"
                          name="firstName"
                          required
                          className="input-field"
                          value={formData.firstName}
                          onChange={handleFormChange}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Last Name
                        </label>
                        <input
                          type="text"
                          name="lastName"
                          className="input-field"
                          value={formData.lastName}
                          onChange={handleFormChange}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          name="email"
                          required
                          className="input-field"
                          value={formData.email}
                          onChange={handleFormChange}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Phone Number *
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          required
                          className="input-field"
                          value={formData.phone}
                          onChange={handleFormChange}
                          placeholder="03XX-XXXXXXX"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          CNIC
                        </label>
                        <input
                          type="text"
                          name="cnic"
                          className="input-field"
                          value={formData.cnic}
                          onChange={handleFormChange}
                          placeholder="XXXXX-XXXXXXX-X"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Date of Birth *
                        </label>
                        <input
                          type="date"
                          name="dateOfBirth"
                          required
                          className="input-field"
                          value={formData.dateOfBirth}
                          onChange={handleFormChange}
                        />
                      </div>
                      {/* ADDED: Joining Date Field */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Joining Date *
                        </label>
                        <input
                          type="date"
                          name="joiningDate"
                          required
                          className="input-field"
                          value={formData.joiningDate}
                          onChange={handleFormChange}
                          max={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Gender *
                        </label>
                        <select
                          name="gender"
                          required
                          className="input-field"
                          value={formData.gender}
                          onChange={handleFormChange}
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Designation *
                        </label>
                        <select
                          name="designation"
                          required
                          className="input-field"
                          value={formData.designation}
                          onChange={handleFormChange}
                        >
                          {designations.map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Qualification *
                        </label>
                        <select
                          name="qualification"
                          required
                          className="input-field"
                          value={formData.qualification}
                          onChange={handleFormChange}
                        >
                          <option value="">Select Qualification</option>
                          {qualifications.map(q => (
                            <option key={q} value={q}>{q}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Specialization *
                        </label>
                        <input
                          type="text"
                          name="specialization"
                          required
                          className="input-field"
                          value={formData.specialization}
                          onChange={handleFormChange}
                          placeholder="e.g., Mathematics, Physics"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Experience (Years) *
                        </label>
                        <input
                          type="number"
                          name="experience"
                          required
                          min="0"
                          className="input-field"
                          value={formData.experience}
                          onChange={handleFormChange}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Monthly Salary (PKR) *
                        </label>
                        <input
                          type="number"
                          name="salary"
                          required
                          min="0"
                          className="input-field"
                          value={formData.salary}
                          onChange={handleFormChange}
                          placeholder="50000"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Subjects */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Subjects Expertise</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {allSubjects.map(subject => (
                        <label key={subject} className="flex items-center p-2 border border-gray-200 rounded hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={formData.subjects.includes(subject)}
                            onChange={() => toggleSubject(subject)}
                            className="mr-2 rounded text-blue-600"
                          />
                          <span className="text-gray-700">{subject}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Address</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Street</label>
                        <input
                          type="text"
                          name="address.street"
                          className="input-field"
                          value={formData.address.street}
                          onChange={handleFormChange}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                        <input
                          type="text"
                          name="address.city"
                          className="input-field"
                          value={formData.address.city}
                          onChange={handleFormChange}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                        <input
                          type="text"
                          name="address.state"
                          className="input-field"
                          value={formData.address.state}
                          onChange={handleFormChange}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Postal Code</label>
                        <input
                          type="text"
                          name="address.postalCode"
                          className="input-field"
                          value={formData.address.postalCode}
                          onChange={handleFormChange}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Login Credentials */}
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">Login Credentials</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Password *
                        </label>
                        <input
                          type="password"
                          name="password"
                          required
                          minLength="6"
                          className="input-field"
                          value={formData.password}
                          onChange={handleFormChange}
                          placeholder="Minimum 6 characters"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Teacher will use this password to login
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Confirm Password *
                        </label>
                        <input
                          type="password"
                          name="confirmPassword"
                          required
                          className="input-field"
                          value={formData.confirmPassword || ''}
                          onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                          placeholder="Confirm password"
                        />
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-3">
                      Teacher will receive login credentials via email and should change password on first login.
                    </p>
                  </div>

                  {/* Form Actions */}
                  <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                    <button
                      type="button"
                      className="btn-secondary px-6"
                      onClick={() => setShowAddModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary px-6"
                    >
                      Add Teacher
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Teacher Modal */}
      {showEditModal && selectedTeacher && (
        <div className="modal-overlay">
          <div className="modal-content max-w-4xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Edit Teacher</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-500 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <form onSubmit={handleUpdateTeacher}>
                <div className="space-y-6">
                  {/* Tabs for different sections */}
                  <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8">
                      <button
                        type="button"
                        onClick={() => setActiveTab('personal')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                          activeTab === 'personal'
                            ? 'border-school-blue text-school-blue'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        Personal Details
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('professional')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                          activeTab === 'professional'
                            ? 'border-school-blue text-school-blue'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        Professional
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('security')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                          activeTab === 'security'
                            ? 'border-school-blue text-school-blue'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        Security
                      </button>
                    </nav>
                  </div>

                  {/* Personal Details Tab */}
                  {activeTab === 'personal' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          First Name *
                        </label>
                        <input
                          type="text"
                          name="firstName"
                          required
                          className="input-field"
                          value={selectedTeacher.firstName || ''}
                          onChange={(e) => setSelectedTeacher({
                            ...selectedTeacher,
                            firstName: e.target.value
                          })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Last Name
                        </label>
                        <input
                          type="text"
                          name="lastName"
                          className="input-field"
                          value={selectedTeacher.lastName || ''}
                          onChange={(e) => setSelectedTeacher({
                            ...selectedTeacher,
                            lastName: e.target.value
                          })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          name="email"
                          required
                          className="input-field"
                          value={selectedTeacher.email || ''}
                          onChange={(e) => setSelectedTeacher({
                            ...selectedTeacher,
                            email: e.target.value
                          })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Phone Number *
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          required
                          className="input-field"
                          value={selectedTeacher.phone || ''}
                          onChange={(e) => setSelectedTeacher({
                            ...selectedTeacher,
                            phone: e.target.value
                          })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          CNIC
                        </label>
                        <input
                          type="text"
                          name="cnic"
                          className="input-field"
                          value={selectedTeacher.cnic || ''}
                          onChange={(e) => setSelectedTeacher({
                            ...selectedTeacher,
                            cnic: e.target.value
                          })}
                          placeholder="XXXXX-XXXXXXX-X"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Date of Birth *
                        </label>
                        <input
                          type="date"
                          name="dateOfBirth"
                          required
                          className="input-field"
                          value={selectedTeacher.dateOfBirth ? 
                            new Date(selectedTeacher.dateOfBirth).toISOString().split('T')[0] : ''}
                          onChange={(e) => setSelectedTeacher({
                            ...selectedTeacher,
                            dateOfBirth: e.target.value
                          })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Gender *
                        </label>
                        <select
                          name="gender"
                          required
                          className="input-field"
                          value={selectedTeacher.gender || 'Male'}
                          onChange={(e) => setSelectedTeacher({
                            ...selectedTeacher,
                            gender: e.target.value
                          })}
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Status *
                        </label>
                        <select
                          name="status"
                          required
                          className="input-field"
                          value={selectedTeacher.status || 'Active'}
                          onChange={(e) => setSelectedTeacher({
                            ...selectedTeacher,
                            status: e.target.value
                          })}
                        >
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                          <option value="On Leave">On Leave</option>
                          <option value="Terminated">Terminated</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Professional Tab */}
                  {activeTab === 'professional' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Designation *
                        </label>
                        <select
                          name="designation"
                          required
                          className="input-field"
                          value={selectedTeacher.designation || 'Teacher'}
                          onChange={(e) => setSelectedTeacher({
                            ...selectedTeacher,
                            designation: e.target.value
                          })}
                        >
                          {designations.map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Qualification *
                        </label>
                        <select
                          name="qualification"
                          required
                          className="input-field"
                          value={selectedTeacher.qualification || ''}
                          onChange={(e) => setSelectedTeacher({
                            ...selectedTeacher,
                            qualification: e.target.value
                          })}
                        >
                          <option value="">Select Qualification</option>
                          {qualifications.map(q => (
                            <option key={q} value={q}>{q}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Specialization *
                        </label>
                        <input
                          type="text"
                          name="specialization"
                          required
                          className="input-field"
                          value={selectedTeacher.specialization || ''}
                          onChange={(e) => setSelectedTeacher({
                            ...selectedTeacher,
                            specialization: e.target.value
                          })}
                          placeholder="e.g., Mathematics, Physics"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Experience (Years) *
                        </label>
                        <input
                          type="number"
                          name="experience"
                          required
                          min="0"
                          className="input-field"
                          value={selectedTeacher.experience || 0}
                          onChange={(e) => setSelectedTeacher({
                            ...selectedTeacher,
                            experience: parseInt(e.target.value) || 0
                          })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Monthly Salary (PKR) *
                        </label>
                        <input
                          type="number"
                          name="salary"
                          required
                          min="0"
                          className="input-field"
                          value={selectedTeacher.salary || 0}
                          onChange={(e) => setSelectedTeacher({
                            ...selectedTeacher,
                            salary: parseFloat(e.target.value) || 0
                          })}
                          placeholder="50000"
                        />
                      </div>
                      {/* ADDED: Joining Date Field in Edit Modal */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Joining Date *
                        </label>
                        <input
                          type="date"
                          name="joiningDate"
                          required
                          className="input-field"
                          value={selectedTeacher.joiningDate ? 
                            new Date(selectedTeacher.joiningDate).toISOString().split('T')[0] : 
                            new Date().toISOString().split('T')[0]}
                          onChange={(e) => setSelectedTeacher({
                            ...selectedTeacher,
                            joiningDate: e.target.value
                          })}
                          max={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                    </div>
                  )}

                  {/* Security Tab */}
                  {activeTab === 'security' && (
                    <div className="space-y-4">
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">
                          <strong>Note:</strong> Only update password if teacher has requested a password reset.
                          Teacher will be logged out from all devices after password change.
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            New Password
                          </label>
                          <input
                            type="password"
                            name="password"
                            className="input-field"
                            value={selectedTeacher.password || ''}
                            onChange={(e) => setSelectedTeacher({
                              ...selectedTeacher,
                              password: e.target.value
                            })}
                            placeholder="Leave empty to keep current password"
                            minLength="6"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Minimum 6 characters
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Confirm New Password
                          </label>
                          <input
                            type="password"
                            name="confirmPassword"
                            className="input-field"
                            value={selectedTeacher.confirmPassword || ''}
                            onChange={(e) => setSelectedTeacher({
                              ...selectedTeacher,
                              confirmPassword: e.target.value
                            })}
                            placeholder="Confirm new password"
                          />
                        </div>
                      </div>
                      
                      {/* Current Password Verification */}
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="flex items-start">
                          <input
                            type="checkbox"
                            id="requireCurrentPassword"
                            checked={requireCurrentPassword}
                            onChange={(e) => setRequireCurrentPassword(e.target.checked)}
                            className="mt-1 mr-2"
                          />
                          <div>
                            <label htmlFor="requireCurrentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                              Require current password verification
                            </label>
                            <p className="text-xs text-gray-500">
                              For security, verify current password before changing
                            </p>
                            {requireCurrentPassword && (
                              <div className="mt-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Current Password
                                </label>
                                <input
                                  type="password"
                                  name="currentPassword"
                                  className="input-field"
                                  value={currentPassword || ''}
                                  onChange={(e) => setCurrentPassword(e.target.value)}
                                  placeholder="Enter teacher's current password"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Subjects Section */}
                  {activeTab !== 'security' && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">Subjects Expertise</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-40 overflow-y-auto p-2">
                        {allSubjects.map(subject => (
                          <label key={subject} className="flex items-center p-2 border border-gray-200 rounded hover:bg-gray-50">
                            <input
                              type="checkbox"
                              checked={selectedTeacher.subjects?.includes(subject) || false}
                              onChange={(e) => {
                                const updatedSubjects = e.target.checked
                                  ? [...(selectedTeacher.subjects || []), subject]
                                  : (selectedTeacher.subjects || []).filter(s => s !== subject);
                                
                                setSelectedTeacher({
                                  ...selectedTeacher,
                                  subjects: updatedSubjects
                                });
                              }}
                              className="mr-2 rounded text-blue-600"
                            />
                            <span className="text-gray-700">{subject}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Form Actions */}
                  <div className="flex justify-between items-center pt-6 border-t border-gray-200">
                    <div className="text-sm text-gray-500">
                      Last updated: {selectedTeacher.updatedAt ? 
                        format(new Date(selectedTeacher.updatedAt), 'dd/MM/yyyy hh:mm a') : 
                        'Not available'}
                    </div>
                    <div className="flex space-x-3">
                      <button
                        type="button"
                        className="btn-secondary px-6"
                        onClick={() => setShowEditModal(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn-primary px-6"
                      >
                        Update Teacher
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Teacher Modal */}
      {showViewModal && selectedTeacher && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    {selectedTeacher.firstName} {selectedTeacher.lastName}
                  </h2>
                  <p className="text-gray-600">{selectedTeacher.designation}</p>
                </div>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-gray-400 hover:text-gray-500 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Personal Information</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Employee ID</label>
                        <p className="text-gray-800 font-medium">{selectedTeacher.employeeId}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Email</label>
                        <p className="text-gray-800">{selectedTeacher.email}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Phone</label>
                        <p className="text-gray-800">{selectedTeacher.phone}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">CNIC</label>
                        <p className="text-gray-800">{selectedTeacher.cnic || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Gender</label>
                        <p className="text-gray-800">{selectedTeacher.gender}</p>
                      </div>
                      {selectedTeacher.dateOfBirth && (
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Date of Birth</label>
                          <p className="text-gray-800">
                            {format(new Date(selectedTeacher.dateOfBirth), 'dd/MM/yyyy')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Professional Information</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Qualification</label>
                        <p className="text-gray-800">{selectedTeacher.qualification}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Specialization</label>
                        <p className="text-gray-800">{selectedTeacher.specialization}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Experience</label>
                        <p className="text-gray-800">{selectedTeacher.experience} years</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Salary</label>
                        <p className="text-gray-800 font-medium">PKR {selectedTeacher.salary?.toLocaleString()}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Joining Date</label>
                        <p className="text-gray-800">
                          {selectedTeacher.joiningDate ? 
                            format(new Date(selectedTeacher.joiningDate), 'dd/MM/yyyy') : 
                            'Not available'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Status</label>
                        <span className={`px-3 py-1 rounded-full text-sm ${
                          selectedTeacher.status === 'Active' ? 'bg-green-100 text-green-800' :
                          selectedTeacher.status === 'Inactive' ? 'bg-red-100 text-red-800' :
                          selectedTeacher.status === 'On Leave' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {selectedTeacher.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Subjects & Classes</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-2">Subjects</label>
                      <div className="flex flex-wrap gap-2">
                        {selectedTeacher.subjects?.map((subject, idx) => (
                          <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                            {subject}
                          </span>
                        )) || <span className="text-gray-400">No subjects assigned</span>}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-2">Assigned Classes</label>
                      <div className="flex flex-wrap gap-2">
                        {selectedTeacher.assignedClasses?.map((cls, idx) => (
                          <span key={idx} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                            {cls.class}-{cls.section}
                          </span>
                        )) || <span className="text-gray-400">No classes assigned</span>}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    className="btn-secondary px-6"
                    onClick={() => setShowViewModal(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Classes Modal */}
      {showAssignModal && selectedTeacher && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  Assign Classes to {selectedTeacher.firstName} {selectedTeacher.lastName}
                </h2>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="text-gray-400 hover:text-gray-500 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <p className="text-gray-600">
                  Select classes to assign this teacher. A teacher can be assigned multiple classes.
                </p>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-2">
                  {classLevels.map(clsLevel => (
                    sections.map(section => {
                      const classFull = `${clsLevel}-${section}`;
                      const isAssigned = selectedTeacher.assignedClasses?.some(
                        c => c.class === clsLevel && c.section === section
                      );
                      
                      return (
                        <label key={classFull} className="flex items-center p-2 border border-gray-200 rounded hover:bg-gray-50">
                          <input
                            type="checkbox"
                            defaultChecked={isAssigned}
                            onChange={(e) => {
                              const updatedClasses = isAssigned
                                ? selectedTeacher.assignedClasses?.filter(
                                    c => !(c.class === clsLevel && c.section === section)
                                  ) || []
                                : [...(selectedTeacher.assignedClasses || []), 
                                   { class: clsLevel, section, subject: '' }];
                              
                              setSelectedTeacher({
                                ...selectedTeacher,
                                assignedClasses: updatedClasses
                              });
                            }}
                            className="mr-3 rounded text-blue-600"
                          />
                          <span className="text-gray-700">
                            {clsLevel === 'Play Group' || clsLevel === 'Nursery' || clsLevel === 'Prep' 
                              ? `${clsLevel} ${section}`
                              : `Class ${clsLevel}-${section}`}
                          </span>
                        </label>
                      );
                    })
                  ))}
                </div>
                
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    className="btn-secondary px-6"
                    onClick={() => setShowAssignModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn-primary px-6"
                    onClick={() => handleAssignClasses(selectedTeacher._id, selectedTeacher.assignedClasses || [])}
                  >
                    Save Assignments
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

export default AdminTeachers;