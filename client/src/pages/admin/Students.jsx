import React, { useState, useEffect } from 'react';
import { 
  FaSearch, FaFilter, FaPlus, FaEdit, FaTrash, FaEye, 
  FaPrint, FaDownload, FaUserGraduate, FaPhone, FaCalendar, 
  FaUser, FaSpinner, FaArrowLeft, FaArrowRight, FaMoneyBillWave
} from 'react-icons/fa';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { studentService } from '../../services/studentService';
import { feeStructureService } from '../../services/feeStructureService';
import { exportToPDF, exportToCSV, printStudents } from '../../utils/exportUtils';

const AdminStudents = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    feePaid: 0,
    feePending: 0,
    onDiscount: 0
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    class: '',
    section: '',
    status: ''
  });
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  });
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [classFees, setClassFees] = useState({}); // Store class fees
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    fatherName: '',
    motherName: '',
    dateOfBirth: '',
    gender: 'Male',
    currentClass: '1',
    section: 'A',
    phone: '',
    fatherPhone: '',
    motherPhone: '',
    emergencyPhone: '',
    email: '',
    address: {
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'Pakistan'
    },
    // ADDED: Admission date field
    admissionDate: new Date().toISOString().split('T')[0], // Default to today
    status: 'Active',
    feeStructure: {
      tuitionFee: 0,
      discountType: 'None',
      discountPercentage: 0
    }
  });

  // Class order for sorting
  const classOrder = [
    'Play Group', 'Nursery', 'Prep', '1', '2', '3', '4', '5', 
    '6', '7', '8', '9', '10'
  ];
  
  const sections = ['A', 'B', 'C', 'D'];
  const discountTypes = ['None', 'Orphan', 'Sibling', 'Custom'];

  // Fetch students
  useEffect(() => {
    fetchStudents();
    fetchStats();
    fetchClassFees();
  }, [pagination.page, filters, searchTerm]);

  // Fetch class fees on component mount
  useEffect(() => {
    fetchClassFees();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
        search: searchTerm,
        sort: 'currentClass'
      };

      const response = await studentService.getStudents(params);
      
      if (response.success) {
        const sortedStudents = response.data.sort((a, b) => {
          const indexA = classOrder.indexOf(a.currentClass);
          const indexB = classOrder.indexOf(b.currentClass);
          return indexA - indexB;
        });
        
        setStudents(sortedStudents);
        setPagination({
          page: response.currentPage || 1,
          limit: pagination.limit,
          total: response.total || 0,
          totalPages: response.totalPages || 1
        });
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error(error.response?.data?.error || 'Failed to fetch students');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await studentService.getStudentStats();
      
      if (response.success) {
        const statsData = response.data.summary || {};
        
        const discountCount = students.filter(s => 
          s.feeStructure?.discountType !== 'None' && 
          s.feeStructure?.discountType !== undefined
        ).length;
        
        setStats({
          total: statsData.total || 0,
          active: statsData.active || 0,
          feePaid: 0,
          feePending: 0,
          onDiscount: discountCount
        });
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchClassFees = async () => {
    try {
      const response = await feeStructureService.getAllClassesWithFees();
      if (response.success) {
        // Convert array to object for easy lookup
        const feesObj = {};
        response.data.forEach(item => {
          feesObj[item.class] = item.tuitionFee;
        });
        setClassFees(feesObj);
      }
    } catch (error) {
      console.error('Failed to fetch class fees:', error);
      // Set default fees if API fails
      const defaultFees = {
        'Play Group': 3000,
        'Nursery': 3500,
        'Prep': 4000,
        '1': 4500,
        '2': 4700,
        '3': 5000,
        '4': 5200,
        '5': 5500,
        '6': 5800,
        '7': 6000,
        '8': 6200,
        '9': 6500,
        '10': 7000
      };
      setClassFees(defaultFees);
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    try {
      const response = await studentService.createStudent(formData);
      
      if (response.success) {
        toast.success('Student added successfully!');
        setShowAddModal(false);
        fetchStudents();
        fetchStats();
        
        // Reset form
        setFormData({
          firstName: '',
          lastName: '',
          fatherName: '',
          motherName: '',
          dateOfBirth: '',
          gender: 'Male',
          currentClass: '1',
          section: 'A',
          phone: '',
          fatherPhone: '',
          motherPhone: '',
          emergencyPhone: '',
          email: '',
          address: {
            street: '',
            city: '',
            state: '',
            postalCode: '',
            country: 'Pakistan'
          },
          admissionDate: new Date().toISOString().split('T')[0], // Reset to today
          status: 'Active',
          feeStructure: {
            tuitionFee: classFees['1'] || 4500,
            discountType: 'None',
            discountPercentage: 0
          }
        });
      } else {
        toast.error(response.error || 'Failed to add student');
      }
    } catch (error) {
      console.error('Error adding student:', error);
      toast.error(error.response?.data?.error || 'Failed to add student');
    }
  };

  const handleDeleteStudent = async (id) => {
    if (!window.confirm('Are you sure you want to PERMANENTLY delete this student? This action cannot be undone.')) return;
    
    try {
      const response = await studentService.deleteStudent(id);
      if (response.success) {
        toast.success('Student deleted permanently!');
        fetchStudents();
        fetchStats();
      } else {
        toast.error(response.error || 'Failed to delete student');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete student');
    }
  };

  const handleUpdateStudent = async (e) => {
  e.preventDefault();
  if (!selectedStudent) return;
  
  try {
    // Prepare the student data with properly structured address
    const updateData = {
      ...selectedStudent,
      // Ensure address is properly structured
      address: selectedStudent.address || {
        street: selectedStudent.street || '',
        city: selectedStudent.city || '',
        state: selectedStudent.state || '',
        postalCode: selectedStudent.postalCode || '',
        country: selectedStudent.country || 'Pakistan'
      },
      // Remove any flat address fields if they exist
      street: undefined,
      city: undefined,
      state: undefined,
      postalCode: undefined,
      country: undefined
    };
    
    // Clean up undefined fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });
    
    const response = await studentService.updateStudent(selectedStudent._id, updateData);
    if (response.success) {
      toast.success('Student updated successfully!');
      setShowEditModal(false);
      fetchStudents();
    } else {
      toast.error(response.error || 'Failed to update student');
    }
  } catch (error) {
    toast.error(error.response?.data?.error || 'Failed to update student');
  }
};

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination({ ...pagination, page: newPage });
    }
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
  } else if (name.startsWith('feeStructure.')) {
    const feeField = name.split('.')[1];
    setFormData({
      ...formData,
      feeStructure: {
        ...formData.feeStructure,
        [feeField]: feeField === 'discountPercentage' ? parseInt(value) || 0 : value
      }
    });
  } else {
    const updatedFormData = {
      ...formData,
      [name]: value
    };

    // If class is changed, update tuition fee automatically
    if (name === 'currentClass' && classFees[value]) {
      updatedFormData.feeStructure = {
        ...formData.feeStructure,
        tuitionFee: classFees[value]
      };
    }

    setFormData(updatedFormData);
  }
};

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    const updatedStudent = {
      ...selectedStudent,
      [name]: value
    };

    // If class is changed in edit, update tuition fee
    if (name === 'currentClass' && classFees[value]) {
      updatedStudent.feeStructure = {
        ...selectedStudent.feeStructure,
        tuitionFee: classFees[value]
      };
    }

    setSelectedStudent(updatedStudent);
  };

  // UPDATED: Print function that fetches ALL students
  const handlePrint = async () => {
    try {
      // Show loading
      toast.loading('Preparing student list for printing...');
      
      // Fetch ALL students without pagination limits
      const response = await studentService.getStudents({
        ...filters,
        search: searchTerm,
        page: 1,
        limit: 1000, // Large number to get all students
        sort: 'currentClass'
      });
      
      toast.dismiss();
      
      if (response.success && response.data.length > 0) {
        // Sort students by class order
        const sortedStudents = response.data.sort((a, b) => {
          const indexA = classOrder.indexOf(a.currentClass);
          const indexB = classOrder.indexOf(b.currentClass);
          return indexA - indexB;
        });
        
        printStudents(sortedStudents);
        toast.success(`Printing ${sortedStudents.length} students`);
      } else {
        toast.error('No students found to print');
      }
    } catch (error) {
      toast.dismiss();
      console.error('Error fetching all students for print:', error);
      toast.error('Failed to fetch students for printing');
    }
  };

  const handleExport = (format = 'pdf') => {
    if (students.length === 0) {
      toast.error('No students to export');
      return;
    }
    
    if (format === 'pdf') {
      exportToPDF(students, 'Student List');
      toast.success('PDF exported successfully');
    } else if (format === 'csv') {
      exportToCSV(students, 'Student List');
      toast.success('CSV exported successfully');
    }
  };

  // Calculate net fee for display
  const calculateNetFee = (tuitionFee, discountType, discountPercentage) => {
    let discount = 0;
    if (discountType === 'Orphan') {
      discount = 50;
    } else if (discountType === 'Sibling') {
      discount = 20;
    } else if (discountType === 'Custom') {
      discount = discountPercentage || 0;
    }
    
    return tuitionFee - (tuitionFee * discount / 100);
  };

  // Update stats when students change
  useEffect(() => {
    if (students.length > 0) {
      const discountCount = students.filter(s => 
        s.feeStructure?.discountType !== 'None' && 
        s.feeStructure?.discountType !== undefined
      ).length;
      
      setStats(prev => ({
        ...prev,
        onDiscount: discountCount
      }));
    }
  }, [students]);

  if (loading && students.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <FaSpinner className="animate-spin text-4xl text-school-blue" />
        <span className="ml-3 text-lg">Loading students...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Student Management</h1>
          <p className="text-gray-600">Manage all student records and information</p>
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
            Add Student
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
          <div className="text-sm text-gray-600">Total Students</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          <div className="text-sm text-gray-600">Active Students</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-yellow-600">
            PKR {stats.feePaid.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Fee Collected</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-red-600">{stats.feePending}</div>
          <div className="text-sm text-gray-600">Fee Pending</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-purple-600">{stats.onDiscount}</div>
          <div className="text-sm text-gray-600">On Discount</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, admission no, roll no, or father name..."
                className="input-field pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <select
            className="input-field"
            name="class"
            value={filters.class}
            onChange={(e) => setFilters({...filters, class: e.target.value})}
          >
            <option value="">All Classes</option>
            {classOrder.map(cls => (
              <option key={cls} value={cls}>Class {cls}</option>
            ))}
          </select>
          <select
            className="input-field"
            name="section"
            value={filters.section}
            onChange={(e) => setFilters({...filters, section: e.target.value})}
          >
            <option value="">All Sections</option>
            {sections.map(sec => (
              <option key={sec} value={sec}>Section {sec}</option>
            ))}
          </select>
          <select
            className="input-field"
            name="status"
            value={filters.status}
            onChange={(e) => setFilters({...filters, status: e.target.value})}
          >
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Graduated">Graduated</option>
          </select>
        </div>
        <div className="mt-4 flex justify-between">
          <div className="flex items-center text-gray-600">
            <FaFilter className="mr-2" />
            <span>Showing {students.length} of {pagination.total} students</span>
          </div>
          <button 
            className="text-sm text-blue-600 hover:text-blue-800"
            onClick={() => {
              setFilters({ class: '', section: '', status: '' });
              setSearchTerm('');
            }}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Students Table */}
      <div className="card">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <FaSpinner className="animate-spin text-2xl text-school-blue" />
              <span className="ml-3">Loading...</span>
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No students found. Try adjusting your filters or add a new student.
            </div>
          ) : (
            <>
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Admission No</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Student Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Class-Section</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Contact</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Fee</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => {
                    const parentRelation = student.gender === 'Female' ? 'D/O' : 'S/O';
                    
                    return (
                    <tr key={student._id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{student.admissionNo}</div>
                        <div className="text-sm text-gray-600">{student.rollNo}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">
                          {student.firstName} {student.lastName || ''}
                        </div>
                        <div className="text-sm text-gray-600">{parentRelation} {student.fatherName}</div>
                        {student.dateOfBirth && (
                          <div className="text-xs text-gray-500">
                            <FaCalendar className="inline mr-1" />
                            {format(new Date(student.dateOfBirth), 'dd/MM/yyyy')}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                          {student.currentClass}-{student.section}
                        </span>
                        {student.admissionDate && (
                          <div className="text-xs text-gray-500 mt-1 flex items-center">
                            <FaCalendar className="mr-1" />
                            Adm: {format(new Date(student.admissionDate), 'dd/MM/yyyy')}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {student.phone && (
                            <div className="flex items-center text-gray-600">
                              <FaPhone className="mr-2 text-sm" />
                              <span className="text-sm">{student.phone}</span>
                            </div>
                          )}
                          {student.fatherPhone && (
                            <div className="text-xs text-gray-500">
                              Father: {student.fatherPhone}
                            </div>
                          )}
                          {!student.phone && !student.fatherPhone && (
                            <div className="text-sm text-gray-400 italic">No contact</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center text-gray-800 font-medium">
                          <FaMoneyBillWave className="mr-1 text-green-600" />
                          <span>PKR {student.feeStructure?.netFee?.toLocaleString() || '0'}</span>
                        </div>
                        {student.feeStructure?.discountType !== 'None' && (
                          <div className="text-xs text-green-600">
                            {student.feeStructure?.discountType} ({student.feeStructure?.discountPercentage}%)
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          student.status === 'Active' ? 'bg-green-100 text-green-800' :
                          student.status === 'Inactive' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {student.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex space-x-2">
                          <button 
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit"
                            onClick={() => {
                              setSelectedStudent(student);
                              setShowEditModal(true);
                            }}
                          >
                            <FaEdit />
                          </button>
                          <button 
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                            title="Delete"
                            onClick={() => handleDeleteStudent(student._id)}
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    Page {pagination.page} of {pagination.totalPages} • Total {pagination.total} students
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

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Add New Student</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-500 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <form onSubmit={handleAddStudent}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleFormChange}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleFormChange}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Father's Name *</label>
                    <input
                      type="text"
                      name="fatherName"
                      value={formData.fatherName}
                      onChange={handleFormChange}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mother's Name</label>
                    <input
                      type="text"
                      name="motherName"
                      value={formData.motherName}
                      onChange={handleFormChange}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth *</label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleFormChange}
                      className="input-field"
                      required
                    />
                  </div>
                  {/* ADDED: Admission Date Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Admission Date *</label>
                    <input
                      type="date"
                      name="admissionDate"
                      value={formData.admissionDate}
                      onChange={handleFormChange}
                      className="input-field"
                      required
                      max={new Date().toISOString().split('T')[0]} // Can't be future date
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleFormChange}
                      className="input-field"
                      required
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Class *</label>
                    <select
                      name="currentClass"
                      value={formData.currentClass}
                      onChange={handleFormChange}
                      className="input-field"
                      required
                    >
                      <option value="">Select Class</option>
                      {classOrder.map(cls => (
                        <option key={cls} value={cls}>
                          {cls === '1' ? 'Class 1' : cls === '10' ? 'Class 10' : cls}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Section *</label>
                    <select
                      name="section"
                      value={formData.section}
                      onChange={handleFormChange}
                      className="input-field"
                      required
                    >
                      {sections.map(sec => (
                        <option key={sec} value={sec}>Section {sec}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleFormChange}
                      className="input-field"
                      placeholder="0300-1234567"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Father's Phone *</label>
                    <input
                      type="tel"
                      name="fatherPhone"
                      value={formData.fatherPhone}
                      onChange={handleFormChange}
                      className="input-field"
                      placeholder="0300-1234567"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mother's Phone</label>
                    <input
                      type="tel"
                      name="motherPhone"
                      value={formData.motherPhone}
                      onChange={handleFormChange}
                      className="input-field"
                      placeholder="0300-1234567"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Phone</label>
                    <input
                      type="tel"
                      name="emergencyPhone"
                      value={formData.emergencyPhone}
                      onChange={handleFormChange}
                      className="input-field"
                      placeholder="0300-1234567"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleFormChange}
                      className="input-field"
                      placeholder="student@example.com"
                    />
                  </div>
                  // In the Add Student Modal form, update the address fields:
<div className="md:col-span-2">
  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
  <textarea
    name="address.street"
    value={formData.address.street}
    onChange={handleFormChange}
    className="input-field"
    rows="2"
    placeholder="House #123, Street #4, Area..."
  />
</div>
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
  <input
    type="text"
    name="address.city"
    value={formData.address.city}
    onChange={handleFormChange}
    className="input-field"
    placeholder="Karachi"
  />
</div>
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
  <input
    type="text"
    name="address.state"
    value={formData.address.state}
    onChange={handleFormChange}
    className="input-field"
    placeholder="Sindh"
  />
</div>
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
  <input
    type="text"
    name="address.postalCode"
    value={formData.address.postalCode}
    onChange={handleFormChange}
    className="input-field"
    placeholder="12345"
  />
</div>
                  
                  {/* Fee Information */}
                  <div className="md:col-span-2 border-t pt-4 mt-2">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                      <FaMoneyBillWave className="mr-2 text-green-600" />
                      Fee Information
                    </h3>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tuition Fee (PKR) *
                      <span className="ml-2 text-xs text-green-600">
                        Auto-filled based on class
                      </span>
                    </label>
                    <div className="flex items-center">
                      <input
                        type="number"
                        name="feeStructure.tuitionFee"
                        value={formData.feeStructure.tuitionFee}
                        onChange={handleFormChange}
                        className="input-field"
                        required
                        min="0"
                        readOnly
                      />
                      <span className="ml-2 text-sm text-gray-500">PKR</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Class {formData.currentClass} fee: PKR {classFees[formData.currentClass]?.toLocaleString() || '0'}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
                    <select
                      name="feeStructure.discountType"
                      value={formData.feeStructure.discountType}
                      onChange={handleFormChange}
                      className="input-field"
                    >
                      {discountTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  
                  {formData.feeStructure.discountType === 'Custom' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Discount Percentage</label>
                      <input
                        type="number"
                        name="feeStructure.discountPercentage"
                        value={formData.feeStructure.discountPercentage}
                        onChange={handleFormChange}
                        className="input-field"
                        min="0"
                        max="100"
                      />
                    </div>
                  )}
                  
                  {formData.feeStructure.discountType !== 'None' && (
                    <div className="md:col-span-2">
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">Calculated Net Fee:</span>
                          <span className="text-lg font-bold text-green-700">
                            PKR {calculateNetFee(
                              formData.feeStructure.tuitionFee,
                              formData.feeStructure.discountType,
                              formData.feeStructure.discountPercentage
                            ).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          Original: PKR {formData.feeStructure.tuitionFee.toLocaleString()} • 
                          Discount: {formData.feeStructure.discountType === 'Custom' 
                            ? `${formData.feeStructure.discountPercentage}%` 
                            : formData.feeStructure.discountType}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end space-x-3 mt-8">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="btn-secondary px-6"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary px-6"
                  >
                    Add Student
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {showEditModal && selectedStudent && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Edit Student</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-500 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <form onSubmit={handleUpdateStudent}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                    <input
                      type="text"
                      name="firstName"
                      value={selectedStudent.firstName || ''}
                      onChange={handleEditFormChange}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      name="lastName"
                      value={selectedStudent.lastName || ''}
                      onChange={handleEditFormChange}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Father's Name *</label>
                    <input
                      type="text"
                      name="fatherName"
                      value={selectedStudent.fatherName || ''}
                      onChange={handleEditFormChange}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mother's Name</label>
                    <input
                      type="text"
                      name="motherName"
                      value={selectedStudent.motherName || ''}
                      onChange={handleEditFormChange}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={selectedStudent.dateOfBirth ? new Date(selectedStudent.dateOfBirth).toISOString().split('T')[0] : ''}
                      onChange={handleEditFormChange}
                      className="input-field"
                    />
                  </div>
                  {/* ADDED: Admission Date Field in Edit Modal */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Admission Date</label>
                    <input
                      type="date"
                      name="admissionDate"
                      value={selectedStudent.admissionDate ? new Date(selectedStudent.admissionDate).toISOString().split('T')[0] : ''}
                      onChange={handleEditFormChange}
                      className="input-field"
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                    <select
                      name="gender"
                      value={selectedStudent.gender || 'Male'}
                      onChange={handleEditFormChange}
                      className="input-field"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Class *</label>
                    <select
                      name="currentClass"
                      value={selectedStudent.currentClass || ''}
                      onChange={handleEditFormChange}
                      className="input-field"
                      required
                    >
                      {classOrder.map(cls => (
                        <option key={cls} value={cls}>
                          {cls === '1' ? 'Class 1' : cls === '10' ? 'Class 10' : cls}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Section *</label>
                    <select
                      name="section"
                      value={selectedStudent.section || 'A'}
                      onChange={handleEditFormChange}
                      className="input-field"
                      required
                    >
                      {sections.map(sec => (
                        <option key={sec} value={sec}>Section {sec}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      value={selectedStudent.phone || ''}
                      onChange={handleEditFormChange}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Father's Phone</label>
                    <input
                      type="tel"
                      name="fatherPhone"
                      value={selectedStudent.fatherPhone || ''}
                      onChange={handleEditFormChange}
                      className="input-field"
                    />
                  </div>
                  // In the Edit Student Modal, update address fields:
<div className="md:col-span-2">
  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
  <textarea
    name="address.street"
    value={selectedStudent.address?.street || ''}
    onChange={(e) => {
      setSelectedStudent({
        ...selectedStudent,
        address: {
          ...selectedStudent.address,
          street: e.target.value
        }
      });
    }}
    className="input-field"
    rows="2"
    placeholder="House #123, Street #4, Area..."
  />
</div>
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
  <input
    type="text"
    name="address.city"
    value={selectedStudent.address?.city || ''}
    onChange={(e) => {
      setSelectedStudent({
        ...selectedStudent,
        address: {
          ...selectedStudent.address,
          city: e.target.value
        }
      });
    }}
    className="input-field"
    placeholder="Karachi"
  />
</div>
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
  <input
    type="text"
    name="address.state"
    value={selectedStudent.address?.state || ''}
    onChange={(e) => {
      setSelectedStudent({
        ...selectedStudent,
        address: {
          ...selectedStudent.address,
          state: e.target.value
        }
      });
    }}
    className="input-field"
    placeholder="Sindh"
  />
</div>
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
  <input
    type="text"
    name="address.postalCode"
    value={selectedStudent.address?.postalCode || ''}
    onChange={(e) => {
      setSelectedStudent({
        ...selectedStudent,
        address: {
          ...selectedStudent.address,
          postalCode: e.target.value
        }
      });
    }}
    className="input-field"
    placeholder="12345"
  />
</div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      name="status"
                      value={selectedStudent.status || 'Active'}
                      onChange={handleEditFormChange}
                      className="input-field"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Graduated">Graduated</option>
                    </select>
                  </div>
                  
                  {/* Fee Information in Edit Modal */}
                  <div className="md:col-span-2 border-t pt-4 mt-2">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">Fee Information</h3>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tuition Fee (PKR) *
                      <span className="ml-2 text-xs text-green-600">
                        Auto-updates with class change
                      </span>
                    </label>
                    <input
                      type="number"
                      name="feeStructure.tuitionFee"
                      value={selectedStudent.feeStructure?.tuitionFee || 0}
                      onChange={(e) => {
                        setSelectedStudent({
                          ...selectedStudent,
                          feeStructure: {
                            ...selectedStudent.feeStructure,
                            tuitionFee: parseInt(e.target.value) || 0
                          }
                        });
                      }}
                      className="input-field"
                      min="0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
                    <select
                      name="feeStructure.discountType"
                      value={selectedStudent.feeStructure?.discountType || 'None'}
                      onChange={(e) => {
                        setSelectedStudent({
                          ...selectedStudent,
                          feeStructure: {
                            ...selectedStudent.feeStructure,
                            discountType: e.target.value
                          }
                        });
                      }}
                      className="input-field"
                    >
                      {discountTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  
                  {selectedStudent.feeStructure?.discountType === 'Custom' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Discount Percentage</label>
                      <input
                        type="number"
                        name="feeStructure.discountPercentage"
                        value={selectedStudent.feeStructure?.discountPercentage || 0}
                        onChange={(e) => {
                          setSelectedStudent({
                            ...selectedStudent,
                            feeStructure: {
                              ...selectedStudent.feeStructure,
                              discountPercentage: parseInt(e.target.value) || 0
                            }
                          });
                        }}
                        className="input-field"
                        min="0"
                        max="100"
                      />
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end space-x-3 mt-8">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="btn-secondary px-6"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary px-6"
                  >
                    Update Student
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStudents;