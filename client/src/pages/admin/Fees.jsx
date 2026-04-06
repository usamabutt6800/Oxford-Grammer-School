// client/src/pages/admin/Fees.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaSearch, FaFilter, FaPlus, FaEdit, FaTrash, FaEye, 
  FaPrint, FaDownload, FaMoneyBillWave, 
  FaSort, FaSortUp, FaSortDown, FaSpinner, FaPlusCircle,
  FaChevronLeft, FaChevronRight, FaHistory, FaReceipt
} from 'react-icons/fa';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

// Class order - Pre Nursery to 10th
const classOrder = ['Play Group', 'Nursery', 'Prep', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const currentYear = new Date().getFullYear();

const getClassOrder = (className) => classOrder.indexOf(className);

const AdminFees = () => {
  const { api } = useAuth();
  const navigate = useNavigate();
  const axiosInstance = api();
  
  const [students, setStudents] = useState([]);
  const [feeDataMap, setFeeDataMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(months[new Date().getMonth()]);
  const [selectedYear, setSelectedYear] = useState(`${currentYear}-${currentYear + 1}`);
  const [filters, setFilters] = useState({ class: '', section: '', status: '' });
  const [sortConfig, setSortConfig] = useState({ key: 'class', direction: 'asc' });
  const [summary, setSummary] = useState({ totalGenerated: 0, totalPaid: 0, totalDue: 0 });
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedFee, setSelectedFee] = useState(null);
  const [newChargeName, setNewChargeName] = useState('');
  const [newChargeAmount, setNewChargeAmount] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsData, setDetailsData] = useState(null);

  // Fetch students with fees
  const fetchData = async () => {
    try {
      setLoading(true);
      const params = {
        month: selectedMonth,
        academicYear: selectedYear,
        ...(filters.class && { class: filters.class }),
        ...(filters.section && { section: filters.section }),
        ...(filters.status && { status: filters.status })
      };
      
      const response = await axiosInstance.get('/fees/students-with-fees', { params });
      
      if (response.data.success) {
        // Sort students by class order
        const sortedStudents = (response.data.data.students || []).sort((a, b) => {
          const classA = getClassOrder(a.currentClass);
          const classB = getClassOrder(b.currentClass);
          if (classA !== classB) return classA - classB;
          return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
        });
        
        setStudents(sortedStudents);
        setFeeDataMap(response.data.data.feeDataMap || {});
        setSummary(response.data.data.summary || { totalGenerated: 0, totalPaid: 0, totalDue: 0 });
      } else {
        toast.error(response.data.error || 'Failed to load data');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error(error.response?.data?.error || 'Failed to load fees');
    } finally {
      setLoading(false);
    }
  };

  // Fetch classes list
  const fetchClasses = async () => {
    try {
      const response = await axiosInstance.get('/students/classes');
      if (response.data.success) {
        const sorted = response.data.data.sort((a, b) => classOrder.indexOf(a) - classOrder.indexOf(b));
        setClasses(sorted);
      }
    } catch (error) {
      setClasses(classOrder);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear, filters.class, filters.section, filters.status]);

  const handleAddCharge = async () => {
    if (!newChargeName || !newChargeAmount) {
      toast.error('Please enter charge name and amount');
      return;
    }
    
    try {
      const response = await axiosInstance.post(`/fees/${selectedFee._id}/add-item`, {
        itemName: newChargeName,
        amount: parseFloat(newChargeAmount),
        isRecurring: false
      });
      
      if (response.data.success) {
        toast.success('Charge added successfully');
        setShowEditModal(false);
        setNewChargeName('');
        setNewChargeAmount('');
        fetchData();
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to add charge');
    }
  };

  const handleDeleteFee = async (feeId, studentName) => {
    if (window.confirm(`Are you sure you want to delete the fee record for ${studentName}?`)) {
      try {
        const response = await axiosInstance.delete(`/fees/${feeId}`);
        if (response.data.success) {
          toast.success('Fee record deleted successfully');
          fetchData();
        }
      } catch (error) {
        console.error('Error deleting fee:', error);
        toast.error(error.response?.data?.error || 'Failed to delete fee record');
      }
    }
  };

  const handleMonthChange = (direction) => {
    const currentIndex = months.indexOf(selectedMonth);
    if (direction === 'next' && currentIndex < months.length - 1) {
      setSelectedMonth(months[currentIndex + 1]);
    } else if (direction === 'prev' && currentIndex > 0) {
      setSelectedMonth(months[currentIndex - 1]);
    }
  };

  const handleSort = (key) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  const getSortedStudents = () => {
    let filtered = [...students];
    
    if (searchTerm) {
      filtered = filtered.filter(s =>
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.admissionNo?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    filtered.sort((a, b) => {
      let aVal, bVal;
      switch (sortConfig.key) {
        case 'studentName':
          aVal = `${a.firstName} ${a.lastName}`;
          bVal = `${b.firstName} ${b.lastName}`;
          break;
        case 'admissionNo':
          aVal = a.admissionNo;
          bVal = b.admissionNo;
          break;
        case 'class':
          aVal = getClassOrder(a.currentClass);
          bVal = getClassOrder(b.currentClass);
          break;
        case 'netAmount':
          aVal = feeDataMap[a._id]?.netAmount || 0;
          bVal = feeDataMap[b._id]?.netAmount || 0;
          break;
        case 'dueAmount':
          aVal = feeDataMap[a._id]?.dueAmount || 0;
          bVal = feeDataMap[b._id]?.dueAmount || 0;
          break;
        case 'status':
          aVal = feeDataMap[a._id]?.status || 'No Fee';
          bVal = feeDataMap[b._id]?.status || 'No Fee';
          break;
        default:
          aVal = getClassOrder(a.currentClass);
          bVal = getClassOrder(b.currentClass);
      }
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    
    return filtered;
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <FaSort className="ml-1 text-gray-400" />;
    return sortConfig.direction === 'asc' ? <FaSortUp className="ml-1 text-blue-600" /> : <FaSortDown className="ml-1 text-blue-600" />;
  };

  const getStatusBadge = (status) => {
    const styles = {
      Paid: 'bg-green-100 text-green-800',
      'Partially Paid': 'bg-yellow-100 text-yellow-800',
      Pending: 'bg-red-100 text-red-800',
      Overdue: 'bg-orange-100 text-orange-800'
    };
    return styles[status] || 'bg-gray-100 text-gray-500';
  };

  const printInvoice = (student, fee) => {
    const printWindow = window.open('', '_blank');
    const totalAmount = fee.feeItems?.reduce((sum, item) => sum + item.amount, 0) || 0;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Fee Invoice - ${student.firstName} ${student.lastName}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .invoice-container { max-width: 800px; margin: 0 auto; }
          .school-header { text-align: center; margin-bottom: 30px; }
          .school-header h1 { color: #1e40af; margin: 0; }
          .school-header h2 { color: #dc2626; margin: 5px 0; }
          .student-info { background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
          .student-info table { width: 100%; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f3f4f6; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .total-row { background: #f3f4f6; font-weight: bold; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; }
          @media print {
            body { margin: 0; padding: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="school-header">
            <h1>OXFORD GRAMMAR SCHOOL</h1>
            <h2>FEE INVOICE</h2>
            <p>123 Education Street, City, Pakistan | Phone: +92 123 4567890</p>
          </div>
          
          <div class="student-info">
            <table>
              <tr><td width="50%"><strong>Student Name:</strong> ${student.firstName} ${student.lastName}</td>
                  <td><strong>Admission No:</strong> ${student.admissionNo}</td></tr>
              <tr><td><strong>Class & Section:</strong> ${student.currentClass}-${student.section || 'N/A'}</td>
                  <td><strong>Father's Name:</strong> ${student.fatherName || 'N/A'}</td></tr>
              <tr><td><strong>Month:</strong> ${selectedMonth} ${selectedYear}</td>
                  <td><strong>Due Date:</strong> ${fee.dueDate ? format(new Date(fee.dueDate), 'dd MMM yyyy') : 'N/A'}</td></tr>
            </table>
          </div>
          
          <table>
            <thead>
              <tr><th>Description</th><th class="text-right">Amount (Rs.)</th></tr>
            </thead>
            <tbody>
              ${fee.feeItems?.map(item => `
                <tr><td>${item.itemName}</td><td class="text-right">${item.amount.toLocaleString()}</td></tr>
              `).join('')}
              <tr class="total-row"><td class="font-bold">Total Amount</td><td class="text-right font-bold">${totalAmount.toLocaleString()}</td></tr>
              ${fee.discount > 0 ? `<tr><td>Discount</td><td class="text-right text-green-600">- ${fee.discount.toLocaleString()}</td></tr>` : ''}
              <tr class="total-row"><td class="font-bold">Net Amount</td><td class="text-right font-bold">${fee.netAmount.toLocaleString()}</td></tr>
              <tr><td>Paid Amount</td><td class="text-right text-green-600">${fee.paidAmount.toLocaleString()}</td></tr>
              <tr><td class="font-bold">Due Amount</td><td class="text-right font-bold text-red-600">${fee.dueAmount.toLocaleString()}</td></tr>
            </tbody>
          </table>
          
          <div class="footer">
            <p>This is a computer generated invoice. No signature required.</p>
            <p>Thank you for your cooperation!</p>
            <p>Generated on: ${new Date().toLocaleString()}</p>
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 500); };
        <\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const sortedStudents = getSortedStudents();

  if (loading && students.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <FaSpinner className="animate-spin text-4xl text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fee Management</h1>
          <p className="text-gray-600">Manage student fees by month</p>
        </div>
        <div className="flex space-x-3 mt-4 md:mt-0">
          <button 
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
            onClick={() => navigate('/admin/fees/generator')}
          >
            <FaPlus className="mr-2" /> Generate Monthly Fees
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">Rs. {summary.totalGenerated?.toLocaleString() || 0}</div>
          <div className="text-sm text-gray-600">Total Generated</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-green-600">Rs. {summary.totalPaid?.toLocaleString() || 0}</div>
          <div className="text-sm text-gray-600">Total Paid</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-red-600">Rs. {summary.totalDue?.toLocaleString() || 0}</div>
          <div className="text-sm text-gray-600">Total Due</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{students.filter(s => feeDataMap[s._id]?.status === 'Pending').length}</div>
          <div className="text-sm text-gray-600">Pending</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">{students.filter(s => feeDataMap[s._id]?.status === 'Overdue').length}</div>
          <div className="text-sm text-gray-600">Overdue</div>
        </div>
      </div>

      {/* Month Selector */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => handleMonthChange('prev')}
              disabled={months.indexOf(selectedMonth) === 0}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
            >
              <FaChevronLeft />
            </button>
            <div className="text-center min-w-[180px]">
              <div className="text-2xl font-bold text-gray-800">{selectedMonth}</div>
              <select 
                className="text-sm text-gray-500 border rounded px-2 py-1 mt-1"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                <option value={`${currentYear-1}-${currentYear}`}>{currentYear-1}-{currentYear}</option>
                <option value={`${currentYear}-${currentYear+1}`}>{currentYear}-{currentYear+1}</option>
                <option value={`${currentYear+1}-${currentYear+2}`}>{currentYear+1}-{currentYear+2}</option>
              </select>
            </div>
            <button
              onClick={() => handleMonthChange('next')}
              disabled={months.indexOf(selectedMonth) === months.length - 1}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
            >
              <FaChevronRight />
            </button>
          </div>
          <div className="text-sm text-gray-500">
            Showing {sortedStudents.length} of {students.length} students
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by student name or admission number..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="border border-gray-300 rounded-lg px-4 py-2"
            value={filters.class}
            onChange={(e) => setFilters({...filters, class: e.target.value, section: ''})}
          >
            <option value="">All Classes</option>
            {classOrder.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            className="border border-gray-300 rounded-lg px-4 py-2"
            value={filters.section}
            onChange={(e) => setFilters({...filters, section: e.target.value})}
            disabled={!filters.class}
          >
            <option value="">All Sections</option>
            <option value="A">Section A</option>
            <option value="B">Section B</option>
            <option value="C">Section C</option>
            <option value="D">Section D</option>
          </select>
          <select
            className="border border-gray-300 rounded-lg px-4 py-2"
            value={filters.status}
            onChange={(e) => setFilters({...filters, status: e.target.value})}
          >
            <option value="">All Status</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Overdue">Overdue</option>
          </select>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left cursor-pointer" onClick={() => handleSort('admissionNo')}>
                  <div className="flex items-center">Admission No {getSortIcon('admissionNo')}</div>
                </th>
                <th className="px-4 py-3 text-left cursor-pointer" onClick={() => handleSort('studentName')}>
                  <div className="flex items-center">Student Name {getSortIcon('studentName')}</div>
                </th>
                <th className="px-4 py-3 text-left cursor-pointer" onClick={() => handleSort('class')}>
                  <div className="flex items-center">Class & Section {getSortIcon('class')}</div>
                </th>
                <th className="px-4 py-3 text-right cursor-pointer" onClick={() => handleSort('netAmount')}>
                  <div className="flex items-center justify-end">Total Amount {getSortIcon('netAmount')}</div>
                </th>
                <th className="px-4 py-3 text-right cursor-pointer" onClick={() => handleSort('dueAmount')}>
                  <div className="flex items-center justify-end">Due Amount {getSortIcon('dueAmount')}</div>
                </th>
                <th className="px-4 py-3 text-left cursor-pointer" onClick={() => handleSort('status')}>
                  <div className="flex items-center">Status {getSortIcon('status')}</div>
                </th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedStudents.map((student) => {
                const fee = feeDataMap[student._id];
                const hasFee = !!fee;
                
                return (
                  <tr key={student._id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-sm">{student.admissionNo}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{student.firstName} {student.lastName}</div>
                      <div className="text-xs text-gray-500">Father: {student.fatherName}</div>
                    </td>
                    <td className="px-4 py-3">
                      {student.currentClass}-{student.section || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {hasFee ? `Rs. ${fee.netAmount?.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-red-600">
                      {hasFee ? `Rs. ${fee.dueAmount?.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {hasFee ? (
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(fee.status)}`}>
                          {fee.status}
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-500">No Fee Record</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center space-x-2">
                        {hasFee && (
                          <>
                            <button 
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="View Details"
                              onClick={() => {
                                setDetailsData({ student, fee });
                                setShowDetailsModal(true);
                              }}
                            >
                              <FaEye />
                            </button>
                            <button 
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                              title="Receive Payment"
                              onClick={() => navigate(`/admin/payments?studentId=${student._id}&feeId=${fee._id}&month=${selectedMonth}`)}
                            >
                              <FaMoneyBillWave />
                            </button>
                            <button 
                              className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg"
                              title="Add Charges"
                              onClick={() => {
                                setSelectedStudent(student);
                                setSelectedFee(fee);
                                setShowEditModal(true);
                                setNewChargeName('');
                                setNewChargeAmount('');
                              }}
                            >
                              <FaEdit />
                            </button>
                            <button 
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                              title="Delete Fee Record"
                              onClick={() => handleDeleteFee(fee._id, `${student.firstName} ${student.lastName}`)}
                            >
                              <FaTrash />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal - Add Charges */}
      {showEditModal && selectedStudent && selectedFee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Add Additional Charge</h2>
                <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p><strong className="text-gray-700">Student:</strong> {selectedStudent.firstName} {selectedStudent.lastName}</p>
                <p><strong className="text-gray-700">Class:</strong> {selectedStudent.currentClass}-{selectedStudent.section}</p>
                <p><strong className="text-gray-700">Month:</strong> {selectedMonth} {selectedYear}</p>
                <p><strong className="text-gray-700">Current Due:</strong> <span className="text-red-600">Rs. {selectedFee.dueAmount?.toLocaleString()}</span></p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Charge Name</label>
                  <input
                    type="text"
                    placeholder="e.g., Library Fee, Sports Fee, Fine"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={newChargeName}
                    onChange={(e) => setNewChargeName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Amount (Rs.)</label>
                  <input
                    type="number"
                    placeholder="Enter amount"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={newChargeAmount}
                    onChange={(e) => setNewChargeAmount(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button onClick={() => setShowEditModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button onClick={handleAddCharge} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Add Charge</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal with Print Button */}
      {showDetailsModal && detailsData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[85vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Fee Details</h2>
                <button onClick={() => setShowDetailsModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
              </div>
              
              {/* Student Info */}
              <div className="p-4 bg-gray-50 rounded-lg mb-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Student Name</p>
                    <p className="font-semibold">{detailsData.student.firstName} {detailsData.student.lastName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Admission No</p>
                    <p className="font-semibold">{detailsData.student.admissionNo}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Class & Section</p>
                    <p className="font-semibold">{detailsData.student.currentClass}-{detailsData.student.section || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Father's Name</p>
                    <p className="font-semibold">{detailsData.student.fatherName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Month</p>
                    <p className="font-semibold">{selectedMonth} {selectedYear}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Due Date</p>
                    <p className="font-semibold">{detailsData.fee.dueDate ? format(new Date(detailsData.fee.dueDate), 'dd MMM yyyy') : 'N/A'}</p>
                  </div>
                </div>
              </div>
              
              {/* Fee Items Table */}
              <h3 className="font-semibold text-gray-800 mb-3">Fee Breakdown</h3>
              <table className="w-full border-collapse mb-6">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border border-gray-300 px-4 py-2 text-left">Description</th>
                    <th className="border border-gray-300 px-4 py-2 text-right">Amount (Rs.)</th>
                    <th className="border border-gray-300 px-4 py-2 text-center">Date Added</th>
                  </tr>
                </thead>
                <tbody>
                  {detailsData.fee.feeItems?.map((item, index) => (
                    <tr key={index}>
                      <td className="border border-gray-300 px-4 py-2">{item.itemName}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">Rs. {item.amount.toLocaleString()}</td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        {item.addedAt ? format(new Date(item.addedAt), 'dd/MM/yyyy') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr className="font-bold">
                    <td className="border border-gray-300 px-4 py-2">Total</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">Rs. {detailsData.fee.totalAmount?.toLocaleString()}</td>
                    <td className="border border-gray-300 px-4 py-2"></td>
                  </tr>
                  {detailsData.fee.discount > 0 && (
                    <tr className="text-green-600">
                      <td className="border border-gray-300 px-4 py-2">Discount</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">- Rs. {detailsData.fee.discount.toLocaleString()}</td>
                      <td className="border border-gray-300 px-4 py-2"></td>
                    </tr>
                  )}
                  <tr className="text-blue-600 font-bold">
                    <td className="border border-gray-300 px-4 py-2">Net Amount</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">Rs. {detailsData.fee.netAmount?.toLocaleString()}</td>
                    <td className="border border-gray-300 px-4 py-2"></td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">Paid Amount</td>
                    <td className="border border-gray-300 px-4 py-2 text-right text-green-600">Rs. {detailsData.fee.paidAmount?.toLocaleString()}</td>
                    <td className="border border-gray-300 px-4 py-2"></td>
                  </tr>
                  <tr className="text-red-600 font-bold">
                    <td className="border border-gray-300 px-4 py-2">Due Amount</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">Rs. {detailsData.fee.dueAmount?.toLocaleString()}</td>
                    <td className="border border-gray-300 px-4 py-2"></td>
                  </tr>
                </tfoot>
              </table>
              
              {/* Payment History */}
              {detailsData.fee.paymentHistory?.length > 0 && (
                <>
                  <h3 className="font-semibold text-gray-800 mb-3">Payment History</h3>
                  <table className="w-full border-collapse mb-6">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="border border-gray-300 px-4 py-2 text-left">Receipt No</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">Amount (Rs.)</th>
                        <th className="border border-gray-300 px-4 py-2 text-center">Date</th>
                        <th className="border border-gray-300 px-4 py-2 text-center">Mode</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailsData.fee.paymentHistory.map((payment, idx) => (
                        <tr key={idx}>
                          <td className="border border-gray-300 px-4 py-2">{payment.receiptNumber || '-'}</td>
                          <td className="border border-gray-300 px-4 py-2 text-right">Rs. {payment.amount.toLocaleString()}</td>
                          <td className="border border-gray-300 px-4 py-2 text-center">
                            {format(new Date(payment.date), 'dd/MM/yyyy hh:mm a')}
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-center">{payment.paymentMode}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
              
              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Close
                </button>
                <button
                  onClick={() => printInvoice(detailsData.student, detailsData.fee)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                >
                  <FaPrint className="mr-2" /> Print Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFees;