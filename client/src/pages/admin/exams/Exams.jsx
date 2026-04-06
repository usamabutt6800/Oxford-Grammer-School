import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaSearch, FaFilter, FaPlus, FaEdit, FaTrash, FaEye, 
  FaCalendarAlt, FaChartBar, FaPrint, FaDownload,
  FaSpinner, FaArrowLeft, FaArrowRight, FaGraduationCap
} from 'react-icons/fa';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { examService } from '../../../services/examService';

const AdminExams = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    academicYear: '',
    class: '',
    status: '',
    name: ''
  });
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  });

  const classLevels = ['Play Group', 'Nursery', 'Prep', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
  const examTypes = ['1st Term', '2nd Term', 'Final'];
  const statusTypes = ['Upcoming', 'Ongoing', 'Completed', 'Cancelled'];

  // Generate academic years (current and next 2 years)
  const currentYear = new Date().getFullYear();
  const academicYears = [
    `${currentYear-1}-${currentYear}`,
    `${currentYear}-${currentYear+1}`,
    `${currentYear+1}-${currentYear+2}`
  ];

  useEffect(() => {
    fetchExams();
  }, [pagination.page, filters, searchTerm]);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
        search: searchTerm
      };

      const response = await examService.getExams(params);
      
      if (response.success) {
        setExams(response.data);
        setPagination({
          page: response.currentPage || 1,
          limit: pagination.limit,
          total: response.total || 0,
          totalPages: response.totalPages || 1
        });
      }
    } catch (error) {
      console.error('Error fetching exams:', error);
      toast.error(error.response?.data?.error || 'Failed to fetch exams');
      setExams([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExam = async (id, examName) => {
    if (!window.confirm(`Are you sure you want to delete ${examName}? This action cannot be undone.`)) return;
    
    try {
      const response = await examService.deleteExam(id);
      if (response.success) {
        toast.success('Exam deleted successfully!');
        fetchExams();
      } else {
        toast.error(response.error || 'Failed to delete exam');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete exam');
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination({ ...pagination, page: newPage });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Upcoming': return 'bg-blue-100 text-blue-800';
      case 'Ongoing': return 'bg-yellow-100 text-yellow-800';
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getExamTypeColor = (type) => {
    switch (type) {
      case '1st Term': return 'border-l-4 border-blue-500';
      case '2nd Term': return 'border-l-4 border-yellow-500';
      case 'Final': return 'border-l-4 border-purple-500';
      default: return 'border-l-4 border-gray-500';
    }
  };

  if (loading && exams.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <FaSpinner className="animate-spin text-4xl text-school-blue" />
        <span className="ml-3 text-lg">Loading exams...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Exam Management</h1>
          <p className="text-gray-600">Manage school exams, results, and student promotion</p>
        </div>
        <div className="flex space-x-3 mt-4 md:mt-0">
          <Link
            to="/admin/exams/reports"
            className="btn-secondary flex items-center"
          >
            <FaChartBar className="mr-2" />
            Reports
          </Link>
          <Link
            to="/admin/exams/create"
            className="btn-primary flex items-center"
          >
            <FaPlus className="mr-2" />
            Create Exam
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-bold text-blue-600">
            {exams.filter(e => e.status === 'Upcoming').length}
          </div>
          <div className="text-sm text-gray-600">Upcoming Exams</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-yellow-600">
            {exams.filter(e => e.status === 'Ongoing').length}
          </div>
          <div className="text-sm text-gray-600">Ongoing Exams</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-600">
            {exams.filter(e => e.status === 'Completed').length}
          </div>
          <div className="text-sm text-gray-600">Completed Exams</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-purple-600">
            {exams.filter(e => e.name === 'Final').length}
          </div>
          <div className="text-sm text-gray-600">Final Exams</div>
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
                placeholder="Search by exam name, class, or academic year..."
                className="input-field pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <select
            className="input-field"
            value={filters.academicYear}
            onChange={(e) => setFilters({...filters, academicYear: e.target.value})}
          >
            <option value="">All Academic Years</option>
            {academicYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <select
            className="input-field"
            value={filters.class}
            onChange={(e) => setFilters({...filters, class: e.target.value})}
          >
            <option value="">All Classes</option>
            {classLevels.map(cls => (
              <option key={cls} value={cls}>Class {cls}</option>
            ))}
          </select>
          <select
            className="input-field"
            value={filters.status}
            onChange={(e) => setFilters({...filters, status: e.target.value})}
          >
            <option value="">All Status</option>
            {statusTypes.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
        <div className="mt-4 flex justify-between">
          <div className="flex items-center text-gray-600">
            <FaFilter className="mr-2" />
            <span>Showing {exams.length} of {pagination.total} exams</span>
          </div>
          <button 
            className="text-sm text-blue-600 hover:text-blue-800"
            onClick={() => setFilters({ academicYear: '', class: '', status: '', name: '' })}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Exams Table */}
      <div className="card">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <FaSpinner className="animate-spin text-2xl text-school-blue" />
              <span className="ml-3">Loading...</span>
            </div>
          ) : exams.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No exams found. Try adjusting your filters or create a new exam.
            </div>
          ) : (
            <>
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Exam Details</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Class & Subjects</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Schedule</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {exams.map((exam) => (
                    <tr key={exam._id} className={`border-b border-gray-200 hover:bg-gray-50 ${getExamTypeColor(exam.name)}`}>
                      <td className="px-4 py-3">
                        <div className="font-bold text-gray-800">{exam.name}</div>
                        <div className="text-sm text-gray-600">{exam.academicYear}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Created by: {exam.createdBy?.name || 'Admin'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">
                          Class {exam.class}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {exam.subjects?.length || 0} Subjects
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Total Marks: {exam.totalMarks?.toLocaleString() || 'N/A'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center text-gray-600">
                          <FaCalendarAlt className="mr-2" />
                          <div>
                            <div className="text-sm">
                              {format(new Date(exam.startDate), 'dd/MM/yyyy')} - {format(new Date(exam.endDate), 'dd/MM/yyyy')}
                            </div>
                            {exam.subjects?.[0]?.examDate && (
                              <div className="text-xs text-gray-500">
                                First paper: {format(new Date(exam.subjects[0].examDate), 'dd/MM')}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(exam.status)}`}>
                          {exam.status}
                        </span>
                        {exam.name === 'Final' && exam.status === 'Completed' && (
                          <div className="text-xs text-purple-600 mt-1 flex items-center">
                            <FaGraduationCap className="mr-1" />
                            Ready for Promotion
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex space-x-2">
                          <Link
                            to={`/admin/exams/${exam._id}/results`}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                            title="View/Enter Results"
                          >
                            <FaEye />
                          </Link>
                          <Link
                            to={`/admin/exams/edit/${exam._id}`}
                            className="p-2 text-green-600 hover:bg-green-50 rounded"
                            title="Edit Exam"
                          >
                            <FaEdit />
                          </Link>
                          {exam.status === 'Completed' && exam.name === 'Final' && (
                            <Link
                              to={`/admin/exams/${exam._id}/promote`}
                              className="p-2 text-purple-600 hover:bg-purple-50 rounded"
                              title="Promote Students"
                            >
                              <FaGraduationCap />
                            </Link>
                          )}
                          <button 
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                            title="Delete Exam"
                            onClick={() => handleDeleteExam(exam._id, `${exam.name} - Class ${exam.class}`)}
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
                    Page {pagination.page} of {pagination.totalPages} • Total {pagination.total} exams
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

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/admin/exams/create"
          className="card hover:bg-blue-50 border border-blue-200 cursor-pointer transition-colors"
        >
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg mr-4">
              <FaPlus className="text-blue-600 text-xl" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Create New Exam</h3>
              <p className="text-sm text-gray-600">Set up 1st Term, 2nd Term or Final exams</p>
            </div>
          </div>
        </Link>
        <Link
          to="/admin/exams/reports"
          className="card hover:bg-green-50 border border-green-200 cursor-pointer transition-colors"
        >
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg mr-4">
              <FaChartBar className="text-green-600 text-xl" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Exam Reports</h3>
              <p className="text-sm text-gray-600">View detailed exam analysis and statistics</p>
            </div>
          </div>
        </Link>
        <div className="card hover:bg-purple-50 border border-purple-200">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg mr-4">
              <FaGraduationCap className="text-purple-600 text-xl" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Promotion Ready</h3>
              <p className="text-sm text-gray-600">
                {exams.filter(e => e.name === 'Final' && e.status === 'Completed').length} final exams ready for promotion
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminExams;