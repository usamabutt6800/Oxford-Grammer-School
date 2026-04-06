// client/src/pages/admin/Payments.jsx

import React, { useState, useEffect } from 'react';
import { 
  FaSearch, FaFilter, FaMoneyBillWave, FaHistory, 
  FaEye, FaSpinner, FaUserGraduate, FaRupeeSign,
  FaCalendarAlt, FaReceipt, FaCheckCircle, FaClock,
  FaExclamationTriangle, FaPrint, FaTimes
} from 'react-icons/fa';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

// Helper function to get status color
const getStatusColor = (status, dueDate, dueAmount) => {
  if (status === 'Paid') return 'bg-green-100 text-green-800';
  if (status === 'Partially Paid') return 'bg-yellow-100 text-yellow-800';
  if (new Date(dueDate) < new Date() && dueAmount > 0) return 'bg-red-100 text-red-800';
  return 'bg-orange-100 text-orange-800';
};

const getStatusText = (status, dueDate, dueAmount) => {
  if (status === 'Paid') return 'Paid';
  if (status === 'Partially Paid') return 'Partially Paid';
  if (new Date(dueDate) < new Date() && dueAmount > 0) return 'Overdue';
  return 'Pending';
};

const AdminPayments = () => {
  const { api } = useAuth();
  const axiosInstance = api();
  
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [paymentFor, setPaymentFor] = useState('');
  const [selectedFeeId, setSelectedFeeId] = useState('');
  const [showInvoice, setShowInvoice] = useState(null);
  const [feeDetails, setFeeDetails] = useState({});
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const classOrder = ['Play Group', 'Nursery', 'Prep', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  
  useEffect(() => {
    fetchClasses();
  }, []);
  
  useEffect(() => {
    if (selectedClass && selectedSection) {
      fetchStudentsWithFees();
    }
  }, [selectedClass, selectedSection]);
  
  const fetchClasses = async () => {
    try {
      const response = await axiosInstance.get('/students/classes');
      if (response.data.success) {
        const sorted = response.data.data.sort((a, b) => 
          classOrder.indexOf(a) - classOrder.indexOf(b)
        );
        setClasses(sorted);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };
  
  const fetchStudentsWithFees = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/fees', {
        params: {
          class: selectedClass,
          section: selectedSection,
          academicYear: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1)
        }
      });
      
      if (response.data.success) {
        const allFees = response.data.data;
        
        // Filter only unpaid fees
        const unpaidFees = allFees.filter(fee => 
          fee.status === 'Pending' || fee.status === 'Partially Paid' || fee.status === 'Overdue'
        );
        
        // Group by student
        const studentMap = {};
        unpaidFees.forEach(fee => {
          if (!fee.student) return;
          const studentId = fee.student._id;
          if (!studentMap[studentId]) {
            studentMap[studentId] = {
              ...fee.student,
              fees: [],
              totalDue: 0,
              totalPaid: 0,
              oldestDue: null,
              overdueCount: 0,
              partiallyPaidCount: 0
            };
          }
          studentMap[studentId].fees.push(fee);
          studentMap[studentId].totalDue += fee.dueAmount;
          studentMap[studentId].totalPaid += fee.paidAmount;
          
          if (fee.status === 'Overdue') studentMap[studentId].overdueCount++;
          if (fee.status === 'Partially Paid') studentMap[studentId].partiallyPaidCount++;
          
          if (!studentMap[studentId].oldestDue || new Date(fee.dueDate) < new Date(studentMap[studentId].oldestDue)) {
            studentMap[studentId].oldestDue = fee.dueDate;
          }
        });
        
        const sortedStudents = Object.values(studentMap).sort((a, b) => {
          const classA = classOrder.indexOf(a.currentClass);
          const classB = classOrder.indexOf(b.currentClass);
          if (classA !== classB) return classA - classB;
          return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
        });
        
        setStudents(sortedStudents);
        setFeeDetails(studentMap);
      }
    } catch (error) {
      console.error('Error fetching fees:', error);
      toast.error('Failed to load fees');
    } finally {
      setLoading(false);
    }
  };
  
  // FIXED: Payment History fetch function
  const fetchPaymentHistory = async (studentId, studentName) => {
    try {
      setLoadingHistory(true);
      console.log('Fetching payment history for student:', studentId);
      
      // Get all fees for this student with payment history
      const response = await axiosInstance.get(`/fees?studentId=${studentId}`);
      
      if (response.data.success) {
        const fees = response.data.data;
        console.log('Fees found:', fees.length);
        
        // Extract payment history from all fees
        const allPayments = [];
        fees.forEach(fee => {
          if (fee.paymentHistory && fee.paymentHistory.length > 0) {
            fee.paymentHistory.forEach(payment => {
              allPayments.push({
                _id: payment._id,
                receiptNumber: payment.receiptNumber || 'N/A',
                amount: payment.amount,
                paymentMode: payment.paymentMode,
                date: payment.date,
                remarks: payment.remarks || '',
                month: fee.month,
                academicYear: fee.academicYear,
                studentName: `${fee.student?.firstName || ''} ${fee.student?.lastName || ''}`.trim(),
                admissionNo: fee.student?.admissionNo,
                class: `${fee.student?.currentClass || ''}-${fee.student?.section || ''}`,
                totalFee: fee.netAmount,
                paidAmount: fee.paidAmount,
                dueAmount: fee.dueAmount
              });
            });
          }
        });
        
        // Sort by date (newest first)
        allPayments.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        console.log('Payments found:', allPayments.length);
        setPaymentHistory(allPayments);
        setShowPaymentHistory(true);
        
        if (allPayments.length === 0) {
          toast.info('No payment history found for this student');
        }
      }
    } catch (error) {
      console.error('Error fetching payment history:', error);
      toast.error('Failed to load payment history');
    } finally {
      setLoadingHistory(false);
    }
  };
  
  const handlePayment = async (student) => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    setProcessingPayment(true);
    
    try {
      const unpaidFees = student.fees.filter(f => f.dueAmount > 0);
      if (unpaidFees.length === 0) {
        toast.error('No pending fees for this student');
        setProcessingPayment(false);
        return;
      }
      
      unpaidFees.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
      
      let remainingAmount = parseFloat(paymentAmount);
      const paymentRecords = [];
      
      for (const fee of unpaidFees) {
        if (remainingAmount <= 0) break;
        
        const amountToPay = Math.min(remainingAmount, fee.dueAmount);
        
        const paymentData = {
          feeId: fee._id,
          amount: amountToPay,
          paymentMode: paymentMode,
          paymentFor: paymentFor || `${fee.month} ${fee.academicYear}`,
          date: new Date()
        };
        
        const response = await axiosInstance.post('/payments/create', paymentData);
        
        if (response.data.success) {
          paymentRecords.push({
            feeId: fee._id,
            amount: amountToPay,
            month: fee.month,
            year: fee.academicYear
          });
          remainingAmount -= amountToPay;
        }
      }
      
      if (paymentRecords.length > 0) {
        toast.success(`Payment of Rs. ${parseFloat(paymentAmount).toLocaleString()} recorded successfully`);
        
        const receiptData = {
          student: student,
          paymentRecords,
          totalAmount: parseFloat(paymentAmount),
          paymentMode,
          date: new Date()
        };
        setShowInvoice(receiptData);
        
        setPaymentAmount('');
        setSelectedStudent(null);
        setPaymentFor('');
        setSelectedFeeId('');
        
        fetchStudentsWithFees();
      } else {
        toast.error('Failed to process payment');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error(error.response?.data?.error || 'Failed to process payment');
    } finally {
      setProcessingPayment(false);
    }
  };
  
  const handlePartialPayment = async (student, fee) => {
    setSelectedStudent(student);
    setSelectedFeeId(fee._id);
    setPaymentAmount('');
    setPaymentFor(`${fee.month} ${fee.academicYear}`);
  };
  
  const formatCurrency = (amount) => `Rs. ${amount?.toLocaleString('en-PK') || 0}`;
  
  const filteredStudents = students.filter(student => {
    if (!searchTerm) return true;
    const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
    const admissionNo = student.admissionNo?.toLowerCase() || '';
    const searchLower = searchTerm.toLowerCase();
    return fullName.includes(searchLower) || admissionNo.includes(searchLower);
  });
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fee Payments</h1>
          <p className="text-gray-600">Collect fees and manage payment records</p>
        </div>
        <div className="mt-4 md:mt-0">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or admission number..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>
      
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Class
            </label>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setSelectedSection('');
              }}
            >
              <option value="">All Classes</option>
              {classes.map(cls => (
                <option key={cls} value={cls}>
                  {cls === 'Play Group' ? cls : `Class ${cls}`}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Section
            </label>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              disabled={!selectedClass}
            >
              <option value="">All Sections</option>
              <option value="A">Section A</option>
              <option value="B">Section B</option>
              <option value="C">Section C</option>
              <option value="D">Section D</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Students List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <FaSpinner className="animate-spin text-4xl text-blue-600" />
        </div>
      ) : filteredStudents.length > 0 ? (
        <div className="space-y-4">
          {filteredStudents.map((student) => (
            <div key={student._id} className="bg-white rounded-lg shadow overflow-hidden">
              {/* Student Header */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-white border-b border-gray-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 flex items-center">
                      <FaUserGraduate className="mr-2 text-blue-600" />
                      {student.firstName} {student.lastName}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Admission No: {student.admissionNo} | Class: {student.currentClass}-{student.section}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-red-600">
                      {formatCurrency(student.totalDue)}
                    </div>
                    <div className="text-sm text-gray-600">Total Due</div>
                  </div>
                </div>
              </div>
              
              {/* Fee Breakdown */}
              <div className="p-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold text-gray-700">Monthly Fee Details</h4>
                  <button
                    onClick={() => fetchPaymentHistory(student._id, `${student.firstName} ${student.lastName}`)}
                    className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                  >
                    <FaHistory className="mr-1" />
                    View Payment History
                  </button>
                </div>
                <div className="space-y-2">
                  {student.fees.map((fee) => (
                    <div key={fee._id} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                      <div>
                        <div className="font-medium text-gray-800">
                          {fee.month} {fee.academicYear}
                        </div>
                        <span className={`inline-block px-2 py-1 text-xs rounded-full mt-1 ${getStatusColor(fee.status, fee.dueDate, fee.dueAmount)}`}>
                          {getStatusText(fee.status, fee.dueDate, fee.dueAmount)}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-gray-800">Total: {formatCurrency(fee.netAmount)}</div>
                        <div className="text-green-600">Paid: {formatCurrency(fee.paidAmount)}</div>
                        <div className="text-red-600 font-semibold">Due: {formatCurrency(fee.dueAmount)}</div>
                        {fee.dueAmount > 0 && (
                          <button
                            onClick={() => handlePartialPayment(student, fee)}
                            className="mt-1 text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100"
                          >
                            Pay This Month
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Payment Form */}
                {selectedStudent?._id === student._id && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold text-gray-700 mb-3">
                      Make Payment
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Amount (Rs.)</label>
                        <input
                          type="number"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          placeholder="Enter amount"
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Payment Mode</label>
                        <select
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          value={paymentMode}
                          onChange={(e) => setPaymentMode(e.target.value)}
                        >
                          <option value="Cash">Cash</option>
                          <option value="Bank Transfer">Bank Transfer</option>
                          <option value="Cheque">Cheque</option>
                          <option value="Online">Online</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Payment For</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          value={paymentFor}
                          onChange={(e) => setPaymentFor(e.target.value)}
                          placeholder="e.g., March 2024"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-3 mt-4">
                      <button
                        onClick={() => {
                          setSelectedStudent(null);
                          setSelectedFeeId('');
                          setPaymentAmount('');
                          setPaymentFor('');
                        }}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handlePayment(student)}
                        disabled={processingPayment}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center"
                      >
                        {processingPayment ? (
                          <FaSpinner className="animate-spin mr-2" />
                        ) : (
                          <FaMoneyBillWave className="mr-2" />
                        )}
                        Process Payment
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Quick Actions */}
                {selectedStudent?._id !== student._id && (
                  <div className="mt-4 flex justify-end space-x-3">
                    <button
                      onClick={() => {
                        setSelectedStudent(student);
                        setSelectedFeeId('');
                        setPaymentAmount('');
                        setPaymentFor('');
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
                    >
                      <FaMoneyBillWave className="mr-2" />
                      Receive Payment
                    </button>
                    <button
                      onClick={() => fetchPaymentHistory(student._id, `${student.firstName} ${student.lastName}`)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 flex items-center"
                    >
                      <FaHistory className="mr-2" />
                      Payment History
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : selectedClass && selectedSection ? (
        <div className="bg-white rounded-lg shadow text-center py-12">
          <p className="text-gray-500">No pending fees found for this class and section</p>
        </div>
      ) : null}
      
      {/* PAYMENT HISTORY MODAL - FIXED VERSION */}
      {showPaymentHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">Payment History</h2>
              <button
                onClick={() => {
                  setShowPaymentHistory(false);
                  setPaymentHistory([]);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                <FaTimes />
              </button>
            </div>
            
            <div className="p-6">
              {loadingHistory ? (
                <div className="flex justify-center py-12">
                  <FaSpinner className="animate-spin text-4xl text-blue-600" />
                </div>
              ) : paymentHistory.length === 0 ? (
                <div className="text-center py-12">
                  <FaHistory className="text-6xl text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No payment history found for this student</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Student Summary */}
                  {paymentHistory[0] && (
                    <div className="bg-gradient-to-r from-blue-50 to-white p-4 rounded-lg mb-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-gray-500">Student Name</p>
                          <p className="font-semibold">{paymentHistory[0].studentName}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Admission No</p>
                          <p className="font-semibold">{paymentHistory[0].admissionNo}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Class</p>
                          <p className="font-semibold">{paymentHistory[0].class}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Total Payments</p>
                          <p className="font-semibold text-green-600">
                            {formatCurrency(paymentHistory.reduce((sum, p) => sum + p.amount, 0))}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Payment History Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="border border-gray-300 px-4 py-2 text-left">Receipt No</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">Month/Year</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">Amount (Rs.)</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">Date & Time</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">Payment Mode</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paymentHistory.map((payment, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-4 py-2 font-mono text-sm">
                              {payment.receiptNumber}
                            </td>
                            <td className="border border-gray-300 px-4 py-2">
                              {payment.month} {payment.academicYear}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-right font-semibold text-green-600">
                              {formatCurrency(payment.amount)}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-center text-sm">
                              {payment.date && format(new Date(payment.date), 'dd MMM yyyy')}
                              <br />
                              <span className="text-xs text-gray-500">
                                {payment.date && format(new Date(payment.date), 'hh:mm a')}
                              </span>
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-center">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                payment.paymentMode === 'Cash' ? 'bg-green-100 text-green-800' :
                                payment.paymentMode === 'Bank Transfer' ? 'bg-blue-100 text-blue-800' :
                                payment.paymentMode === 'Cheque' ? 'bg-purple-100 text-purple-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {payment.paymentMode}
                              </span>
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-sm">
                              {payment.remarks || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 font-bold">
                        <tr>
                          <td className="border border-gray-300 px-4 py-2" colSpan="2">Total Paid</td>
                          <td className="border border-gray-300 px-4 py-2 text-right text-green-600">
                            {formatCurrency(paymentHistory.reduce((sum, p) => sum + p.amount, 0))}
                          </td>
                          <td className="border border-gray-300 px-4 py-2" colSpan="3"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>
            
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end">
              <button
                onClick={() => {
                  setShowPaymentHistory(false);
                  setPaymentHistory([]);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Invoice Modal */}
      {showInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Payment Receipt</h2>
                <button
                  onClick={() => setShowInvoice(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-gray-800">Oxford Grammar School</h3>
                  <p className="text-gray-600">Fee Payment Receipt</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-sm text-gray-600">Student Name:</p>
                    <p className="font-semibold">{showInvoice.student.firstName} {showInvoice.student.lastName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Admission No:</p>
                    <p className="font-semibold">{showInvoice.student.admissionNo}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Class:</p>
                    <p className="font-semibold">{showInvoice.student.currentClass}-{showInvoice.student.section}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Payment Date:</p>
                    <p className="font-semibold">{format(showInvoice.date, 'dd MMM yyyy hh:mm a')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Payment Mode:</p>
                    <p className="font-semibold">{showInvoice.paymentMode}</p>
                  </div>
                </div>
                
                <table className="w-full mb-6">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Month</th>
                      <th className="px-4 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {showInvoice.paymentRecords.map((record, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="px-4 py-2">{record.month} {record.year}</td>
                        <td className="px-4 py-2 text-right">{formatCurrency(record.amount)}</td>
                      </tr>
                    ))}
                    <tr className="font-bold">
                      <td className="px-4 py-2">Total</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(showInvoice.totalAmount)}</td>
                    </tr>
                  </tbody>
                </table>
                
                <div className="text-center text-sm text-gray-500 mt-6">
                  <p>Thank you for your payment!</p>
                  <p>This is a computer-generated receipt, no signature required.</p>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-4">
                <button
                  onClick={() => setShowInvoice(null)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                >
                  Close
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
                >
                  <FaPrint className="mr-2" />
                  Print Receipt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPayments;