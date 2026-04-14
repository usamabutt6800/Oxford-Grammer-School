import React, { useState, useEffect } from 'react';
import { 
  FaSpinner, FaPlus, FaTrash, FaSave, 
  FaCalendarAlt, FaClock, FaUserGraduate, FaBook, 
  FaArrowLeft, FaMoneyBillWave, FaPercentage
} from 'react-icons/fa';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const FeesGenerator = () => {
  const { api } = useAuth();
  const axiosInstance = api();
  const navigate = useNavigate();
  
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feeStructure, setFeeStructure] = useState(null);
  
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const currentMonth = months[new Date().getMonth()];
  const currentYear = new Date().getFullYear();
  const academicYear = `${currentYear}-${currentYear + 1}`;
  
  const [studentFees, setStudentFees] = useState({});
  
  // Currency formatter for Pakistan Rupees
  const formatCurrency = (amount) => {
    return `Rs. ${amount.toLocaleString('en-PK')}`;
  };
  
  // Fetch classes on load
  useEffect(() => {
    fetchClasses();
  }, []);
  
  // Fetch students when class/section changes
  useEffect(() => {
    if (selectedClass && selectedSection) {
      fetchStudents();
    } else {
      setStudents([]);
      setStudentFees({});
    }
  }, [selectedClass, selectedSection]);
  
  const fetchClasses = async () => {
    try {
      console.log('Fetching classes...');
      const response = await axiosInstance.get('/students/classes');
      console.log('Classes response:', response.data);
      
      if (response.data.success && response.data.data) {
        // Sort classes properly
        const classOrder = ['Play Group', 'Nursery', 'Prep', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
        const sortedClasses = [...response.data.data].sort((a, b) => {
          return classOrder.indexOf(a) - classOrder.indexOf(b);
        });
        setClasses(sortedClasses);
      } else {
        // Fallback classes
        setClasses(['Play Group', 'Nursery', 'Prep', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      setClasses(['Play Group', 'Nursery', 'Prep', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
    }
  };
  
  const fetchStudents = async () => {
  try {
    setLoading(true);
    console.log('Fetching students with params:', {
      class: selectedClass,
      section: selectedSection,
      status: 'Active'
    });
    
    const response = await axiosInstance.get('/students', {
      params: {
        class: selectedClass,
        section: selectedSection,
        status: 'Active'
      }
    });
    
    console.log('Students API Response:', response.data);
    
    if (response.data.success && response.data.data) {
      const studentsData = response.data.data;
      console.log(`Found ${studentsData.length} students:`, studentsData);
      setStudents(studentsData);
      
      if (studentsData.length === 0) {
        toast.info(`No students found in Class ${selectedClass}-${selectedSection}`);
        setStudentFees({});
        setLoading(false);
        return;
      }
      
      // Initialize student fees with INDIVIDUAL student fee structure
      const initialFees = {};
      
      for (const student of studentsData) {
        // Get student's individual fee structure
        let tuitionFee = 0;
        let discountAmount = 0;
        let netFee = 0;
        let discountType = 'None';
        let discountPercentage = 0;
        
        // Check if student has individual fee structure
        if (student.feeStructure) {
          tuitionFee = student.feeStructure.tuitionFee || 0;
          discountType = student.feeStructure.discountType || 'None';
          discountPercentage = student.feeStructure.discountPercentage || 0;
          
          // Calculate discount based on type
          if (discountType === 'Orphan') {
            discountPercentage = 50;
          } else if (discountType === 'Sibling') {
            discountPercentage = 20;
          }
          
          discountAmount = (tuitionFee * discountPercentage) / 100;
          netFee = tuitionFee - discountAmount;
          
          console.log(`Student: ${student.firstName} ${student.lastName}`);
          console.log(`  - Tuition Fee: ${tuitionFee}`);
          console.log(`  - Discount Type: ${discountType}`);
          console.log(`  - Discount %: ${discountPercentage}%`);
          console.log(`  - Discount Amount: ${discountAmount}`);
          console.log(`  - Net Fee: ${netFee}`);
        } else {
          // Fallback to class-level fee structure
          try {
            const feeResponse = await axiosInstance.get(`/fee-structure/class/${selectedClass}`);
            if (feeResponse.data.success && feeResponse.data.data) {
              tuitionFee = feeResponse.data.data.tuitionFee || 0;
              netFee = tuitionFee;
              console.log(`Using class-level fee for ${student.firstName}: ${tuitionFee}`);
            }
          } catch (feeError) {
            console.error('Error fetching class fee structure:', feeError);
            tuitionFee = 0;
            netFee = 0;
          }
        }
        
        initialFees[student._id] = {
          studentId: student._id,
          studentName: `${student.firstName} ${student.lastName || ''}`.trim(),
          admissionNo: student.admissionNo,
          tuitionFee: tuitionFee,
          originalTuitionFee: tuitionFee,
          discountType: discountType,
          discountPercentage: discountPercentage,
          discountAmount: discountAmount,
          netFee: netFee,
          additionalCharges: [],
          totalAmount: netFee, // Start with net fee after discount
          month: currentMonth,
          academicYear: academicYear,
          dueDate: new Date(currentYear, new Date().getMonth(), 10)
        };
      }
      
      setStudentFees(initialFees);
      console.log('Initialized fees for', Object.keys(initialFees).length, 'students with individual discounts');
    } else {
      console.error('Invalid response structure:', response.data);
      toast.error('Failed to load students: Invalid response');
    }
  } catch (error) {
    console.error('Error fetching students:', error);
    toast.error(error.response?.data?.error || 'Failed to load students');
  } finally {
    setLoading(false);
  }
};
  
  const handleAddAdditionalCharge = (studentId) => {
  const newCharge = {
    id: Date.now(),
    name: '',
    amount: 0,
    createdAt: new Date().toISOString()
  };
  
  setStudentFees(prev => ({
    ...prev,
    [studentId]: {
      ...prev[studentId],
      additionalCharges: [...(prev[studentId].additionalCharges || []), newCharge],
      totalAmount: calculateTotalAmount({
        ...prev[studentId],
        additionalCharges: [...(prev[studentId].additionalCharges || []), newCharge]
      })
    }
  }));
};
  
  const handleUpdateAdditionalCharge = (studentId, chargeId, field, value) => {
  setStudentFees(prev => {
    const updatedCharges = prev[studentId].additionalCharges.map(charge => {
      if (charge.id === chargeId) {
        const updatedCharge = { ...charge, [field]: value };
        if (field === 'amount') {
          updatedCharge.amount = parseFloat(value) || 0;
        }
        return updatedCharge;
      }
      return charge;
    });
    
    const updatedStudentFee = {
      ...prev[studentId],
      additionalCharges: updatedCharges
    };
    
    return {
      ...prev,
      [studentId]: {
        ...updatedStudentFee,
        totalAmount: calculateTotalAmount(updatedStudentFee)
      }
    };
  });
};
  
  const handleRemoveAdditionalCharge = (studentId, chargeId) => {
  setStudentFees(prev => {
    const updatedCharges = prev[studentId].additionalCharges.filter(charge => charge.id !== chargeId);
    
    const updatedStudentFee = {
      ...prev[studentId],
      additionalCharges: updatedCharges
    };
    
    return {
      ...prev,
      [studentId]: {
        ...updatedStudentFee,
        totalAmount: calculateTotalAmount(updatedStudentFee)
      }
    };
  });
};
  
  const calculateTotalAmount = (studentFee) => {
  // Start with net fee (after discount)
  let total = studentFee.netFee || studentFee.tuitionFee;
  
  // Add additional charges
  const additionalTotal = (studentFee.additionalCharges || []).reduce((sum, charge) => sum + (charge.amount || 0), 0);
  total += additionalTotal;
  
  return total;
};
  
  const handleSaveFees = async () => {
  if (!selectedClass || !selectedSection) {
    toast.error('Please select class and section');
    return;
  }
  
  if (students.length === 0) {
    toast.error('No students to save fees for');
    return;
  }
  
  setSaving(true);
  
  try {
    // Prepare fees data
    const feesToSave = [];
    
    for (const [studentId, feeData] of Object.entries(studentFees)) {
      const additionalTotal = feeData.additionalCharges.reduce((sum, c) => sum + (c.amount || 0), 0);

      // feeItems contains ONLY positive charges — no discount line item here.
      // The discount is stored separately in fee.discount and applied via netAmount.
      // Adding it to feeItems AND fee.discount was causing double deduction.
      const feeItems = [
        {
          itemName: 'Tuition Fee',
          amount: feeData.tuitionFee,
          isRecurring: true,
        }
      ];

      // Additional charges (exam fee, canteen, etc.)
      feeData.additionalCharges.forEach(charge => {
        if (charge.name && charge.name.trim() !== '' && charge.amount > 0) {
          feeItems.push({
            itemName: charge.name,
            amount: charge.amount,
            isRecurring: false,
            addedAt: charge.createdAt,
            description: `Added on ${format(new Date(charge.createdAt), 'PPP p')}`
          });
        }
      });

      // totalAmount = sum of all positive fee items (before discount)
      const totalAmount = feeData.tuitionFee + additionalTotal;

      // netAmount = totalAmount minus discount
      const discountAmount = feeData.discountAmount || 0;
      const netAmount = totalAmount - discountAmount;

      feesToSave.push({
        student:          studentId,
        studentName:      feeData.studentName,
        admissionNo:      feeData.admissionNo,
        studentClass:     selectedClass,
        studentSection:   selectedSection,
        academicYear:     feeData.academicYear,
        month:            feeData.month,
        feeItems,
        totalAmount,
        discount:         discountAmount,
        netAmount,
        paidAmount:       0,
        dueDate:          feeData.dueDate,
        status:           'Pending',
      });
    }
    
    console.log('Saving fees with discounts:', feesToSave);
    
    // Save to database
    const response = await axiosInstance.post('/fees/bulk-generate', {
      class: selectedClass,
      section: selectedSection,
      month: currentMonth,
      academicYear: academicYear,
      fees: feesToSave
    });
    
    if (response.data.success) {
      toast.success(`✅ Successfully saved fees for ${feesToSave.length} students`);
      setTimeout(() => {
        navigate('/admin/fees');
      }, 1500);
    } else {
      toast.error(response.data.error || 'Failed to save fees');
    }
  } catch (error) {
    console.error('Error saving fees:', error);
    toast.error(error.response?.data?.error || 'Failed to save fees');
  } finally {
    setSaving(false);
  }
};
  
  const formatDateTime = (date) => {
    return format(new Date(date), 'dd/MM/yyyy h:mm a');
  };
  
  const getClassDisplayName = (className) => {
    if (className === 'Play Group') return 'Play Group';
    if (className === 'Nursery') return 'Nursery';
    if (className === 'Prep') return 'Prep';
    if (['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].includes(className)) {
      return `Class ${className}`;
    }
    return className;
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/admin/fees')}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <FaArrowLeft className="text-gray-600 text-xl" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Generate Monthly Fees</h1>
            <p className="text-gray-600">Add tuition fees and additional charges for students</p>
          </div>
        </div>
        <button
          onClick={handleSaveFees}
          disabled={saving || students.length === 0}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center space-x-2 transition disabled:opacity-50 disabled:cursor-not-allowed mt-4 md:mt-0"
        >
          {saving ? (
            <>
              <FaSpinner className="animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <FaSave />
              <span>Save All Fees</span>
            </>
          )}
        </button>
      </div>
      
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Class *
            </label>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setSelectedSection('');
                setStudents([]);
                setStudentFees({});
              }}
            >
              <option value="">Select Class</option>
              {classes.map(cls => (
                <option key={cls} value={cls}>
                  {getClassDisplayName(cls)}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Section *
            </label>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              disabled={!selectedClass}
            >
              <option value="">Select Section</option>
              <option value="A">Section A</option>
              <option value="B">Section B</option>
              <option value="C">Section C</option>
              <option value="D">Section D</option>
            </select>
          </div>
        </div>
        
        {selectedClass && selectedSection && students.length > 0 && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center text-sm text-gray-700">
              <FaCalendarAlt className="mr-2 text-blue-600" />
              <span>Generating fees for: <strong>{currentMonth} {academicYear}</strong></span>
            </div>
            <div className="flex items-center text-sm text-gray-700 mt-2">
              <FaMoneyBillWave className="mr-2 text-blue-600" />
              <span>Due Date: <strong>{format(new Date(currentYear, new Date().getMonth(), 10), 'dd MMMM yyyy')}</strong></span>
            </div>
            <div className="flex items-center text-sm text-gray-700 mt-2">
              <FaUserGraduate className="mr-2 text-blue-600" />
              <span>Total Students: <strong>{students.length}</strong></span>
            </div>
          </div>
        )}
      </div>
      
      {/* Students List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <FaSpinner className="animate-spin text-4xl text-blue-600" />
        </div>
      ) : students.length > 0 ? (
        <div className="space-y-6">
          {Object.values(studentFees).map((studentFee) => (
            <div key={studentFee.studentId} className="bg-white rounded-lg shadow p-6">
              {/* Student Header */}
              <div className="flex justify-between items-start mb-4 pb-4 border-b border-gray-200">
                <div>
                  <h3 className="text-xl font-bold text-gray-800 flex items-center">
                    <FaUserGraduate className="mr-2 text-blue-600" />
                    {studentFee.studentName}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Admission No: {studentFee.admissionNo} | Class: {getClassDisplayName(selectedClass)}-{selectedSection}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(studentFee.totalAmount)}
                  </div>
                  <div className="text-sm text-gray-600">Total Amount</div>
                </div>
              </div>
              
              {/* Tuition Fee - Updated with discount display */}
              <div className="mb-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <FaBook className="text-green-600 mr-2" />
                    <div>
                      <div className="font-semibold text-gray-800">Tuition Fee</div>
                      <div className="text-xs text-gray-500">Monthly recurring fee</div>
                    </div>
                  </div>
                  <div className="text-right">
                    {studentFee.discountAmount > 0 ? (
                      <>
                        <div className="text-sm text-gray-500 line-through">
                          {formatCurrency(studentFee.tuitionFee)}
                        </div>
                        <div className="text-lg font-semibold text-green-600">
                          {formatCurrency(studentFee.netFee)}
                        </div>
                      </>
                    ) : (
                      <div className="text-lg font-semibold text-gray-800">
                        {formatCurrency(studentFee.tuitionFee)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Discount Information - New Section */}
              {studentFee.discountAmount > 0 && (
                <div className="mb-4">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center">
                      <FaPercentage className="text-green-600 mr-2" />
                      <div>
                        <div className="font-semibold text-green-800">Discount Applied</div>
                        <div className="text-xs text-green-600">
                          {studentFee.discountType} - {studentFee.discountPercentage}% off
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-green-600">
                        - {formatCurrency(studentFee.discountAmount)}
                      </div>
                      <div className="text-xs text-gray-500">Applied to tuition fee</div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Additional Charges */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold text-gray-700">Additional Charges</h4>
                  <button
                    onClick={() => handleAddAdditionalCharge(studentFee.studentId)}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                  >
                    <FaPlus className="mr-1" />
                    Add Charge
                  </button>
                </div>
                
                {studentFee.additionalCharges && studentFee.additionalCharges.length > 0 ? (
                  <div className="space-y-3">
                    {studentFee.additionalCharges.map((charge) => (
                      <div key={charge.id} className="p-3 border border-gray-200 rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Charge Name
                            </label>
                            <input
                              type="text"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              placeholder="e.g., Library Fee, Sports Fee"
                              value={charge.name}
                              onChange={(e) => handleUpdateAdditionalCharge(studentFee.studentId, charge.id, 'name', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Amount (Rs.)
                            </label>
                            <input
                              type="number"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              placeholder="Amount in Rupees"
                              value={charge.amount}
                              onChange={(e) => handleUpdateAdditionalCharge(studentFee.studentId, charge.id, 'amount', e.target.value)}
                            />
                          </div>
                          <div className="flex items-end justify-between">
                            <div className="flex-1">
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Date & Time
                              </label>
                              <div className="text-sm text-gray-600 flex items-center">
                                <FaClock className="mr-1 text-xs" />
                                {formatDateTime(charge.createdAt)}
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemoveAdditionalCharge(studentFee.studentId, charge.id)}
                              className="ml-2 text-red-600 hover:text-red-800 p-1"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                    No additional charges added. Click "Add Charge" to add custom fees.
                  </div>
                )}
              </div>
              
              {/* Summary */}
              <div className="pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Amount:</span>
                  <span className="text-xl font-bold text-blue-600">
                    {formatCurrency(studentFee.totalAmount)}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-gray-600">Due Date:</span>
                  <span className="text-gray-700">
                    {format(new Date(studentFee.dueDate), 'dd MMMM yyyy')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : selectedClass && selectedSection ? (
        <div className="bg-white rounded-lg shadow text-center py-12">
          <p className="text-gray-500">No students found in Class {getClassDisplayName(selectedClass)}-{selectedSection}</p>
          <p className="text-sm text-gray-400 mt-2">Please check if students are added to this class and section</p>
        </div>
      ) : null}
    </div>
  );
};

export default FeesGenerator;