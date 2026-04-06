// server/src/modules/fees/controllers/feeController.js

import Fee, { FeeGenerationLog } from '../models/Fee.js';
import Student from '../../students/models/Student.js';
import FeeStructure from '../models/FeeStructure.js';
import asyncHandler from '../../../middlewares/asyncHandler.js';
import { format } from 'date-fns';

// @desc    Get all fees with filters
// @route   GET /api/v1/fees
// @access  Private (Admin)
export const getFees = asyncHandler(async (req, res) => {
  const { class: className, month, status, studentId, academicYear } = req.query;
  
  let query = {};
  
  if (className) {
    const students = await Student.find({ currentClass: className });
    query.student = { $in: students.map(s => s._id) };
  }
  
  if (studentId) {
    query.student = studentId;
  }
  
  if (month) {
    query.month = month;
  }
  
  if (status) {
    query.status = status;
  }
  
  if (academicYear) {
    query.academicYear = academicYear;
  }
  
  const fees = await Fee.find(query)
    .populate({
      path: 'student',
      select: 'firstName lastName admissionNo currentClass section rollNo fatherName motherName phone email feeStructure'
    })
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 })
    .lean(); // Use lean() for better performance
  
  // Process fees to ensure student name is always available
  const feesWithDetails = fees.map(fee => {
    // If student is populated, ensure name fields are accessible
    if (fee.student) {
      // Make sure student has full name
      fee.student.fullName = `${fee.student.firstName || ''} ${fee.student.lastName || ''}`.trim();
      
      // Ensure admissionNo is present
      if (!fee.student.admissionNo) {
        fee.student.admissionNo = 'N/A';
      }
      
      // Ensure currentClass is present
      if (!fee.student.currentClass) {
        fee.student.currentClass = 'Not Assigned';
      }
      
      // Ensure section is present
      if (!fee.student.section) {
        fee.student.section = 'N/A';
      }
    } else {
      // If student is not populated (shouldn't happen), provide fallback
      fee.student = {
        firstName: 'Unknown',
        lastName: 'Student',
        fullName: 'Unknown Student',
        admissionNo: 'N/A',
        currentClass: 'N/A',
        section: 'N/A'
      };
    }
    
    // Calculate overdue status
    const currentDate = new Date();
    if (fee.status !== 'Paid' && new Date(fee.dueDate) < currentDate && fee.dueAmount > 0) {
      fee.status = 'Overdue';
    }
    
    return fee;
  });
  
  res.status(200).json({
    success: true,
    count: feesWithDetails.length,
    data: feesWithDetails
  });
});

// @desc    Get students with their fees for a specific month
// @route   GET /api/v1/fees/students-with-fees
// @access  Private (Admin)
// Add this function at the end of feeController.js

// @desc    Get students with their fees for a specific month
// @route   GET /api/v1/fees/students-with-fees
// @access  Private (Admin)
export const getStudentsWithFees = asyncHandler(async (req, res) => {
  const { class: className, section, month, academicYear, status } = req.query;
  
  console.log('📊 getStudentsWithFees called with:', { className, section, month, academicYear, status });
  
  // Validate required params
  if (!month || !academicYear) {
    return res.status(400).json({
      success: false,
      error: 'Month and academicYear are required'
    });
  }
  
  // Build student query
  const studentQuery = { status: 'Active' };
  if (className && className !== '') studentQuery.currentClass = className;
  if (section && section !== '') studentQuery.section = section;
  
  // Get all students
  const students = await Student.find(studentQuery)
    .select('firstName lastName admissionNo currentClass section fatherName motherName phone email feeStructure')
    .sort({ currentClass: 1, firstName: 1 });
  
  console.log(`Found ${students.length} students`);
  
  if (students.length === 0) {
    return res.status(200).json({
      success: true,
      data: {
        students: [],
        feeDataMap: {},
        summary: {
          totalGenerated: 0,
          totalPaid: 0,
          totalDue: 0,
          collectionRate: 0,
          totalStudents: 0,
          studentsWithFees: 0
        }
      }
    });
  }
  
  // Get fees for the selected month
  const studentIds = students.map(s => s._id);
  const feeQuery = { 
    student: { $in: studentIds },
    month: month, 
    academicYear: academicYear 
  };
  
  const fees = await Fee.find(feeQuery)
    .populate('student', 'firstName lastName admissionNo currentClass section');
  
  console.log(`Found ${fees.length} fee records for ${month} ${academicYear}`);
  
  // Create a map of studentId -> fee data
  const feeDataMap = {};
  fees.forEach(fee => {
    if (fee.student) {
      feeDataMap[fee.student._id.toString()] = {
        _id: fee._id,
        totalAmount: fee.totalAmount,
        discount: fee.discount,
        netAmount: fee.netAmount,
        paidAmount: fee.paidAmount,
        dueAmount: fee.dueAmount,
        dueDate: fee.dueDate,
        status: fee.status,
        feeItems: fee.feeItems,
        paymentHistory: fee.paymentHistory
      };
    }
  });
  
  // Calculate summary
  let totalGenerated = 0, totalPaid = 0, totalDue = 0;
  fees.forEach(fee => {
    totalGenerated += fee.netAmount || 0;
    totalPaid += fee.paidAmount || 0;
    totalDue += fee.dueAmount || 0;
  });
  
  // Filter students by fee status if needed
  let filteredStudents = students;
  if (status && status !== 'All' && status !== '') {
    filteredStudents = students.filter(student => {
      const fee = feeDataMap[student._id.toString()];
      return fee?.status === status;
    });
  }
  
  res.status(200).json({
    success: true,
    data: {
      students: filteredStudents,
      feeDataMap,
      summary: {
        totalGenerated,
        totalPaid,
        totalDue,
        collectionRate: totalGenerated > 0 ? ((totalPaid / totalGenerated) * 100).toFixed(2) : 0,
        totalStudents: filteredStudents.length,
        studentsWithFees: fees.length
      }
    }
  });
});

// @desc    Get fees for a specific student and month
// @route   GET /api/v1/fees/student/:studentId
// @access  Private (Admin)
export const getStudentFeesByMonth = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const { month, academicYear } = req.query;
  
  let query = { student: studentId };
  if (month) query.month = month;
  if (academicYear) query.academicYear = academicYear;
  
  const fees = await Fee.find(query)
    .populate('student', 'firstName lastName admissionNo currentClass section fatherName motherName phone email rollNo')
    .sort({ month: 1 })
    .lean();
  
  // Get student details
  const student = await Student.findById(studentId)
    .select('firstName lastName admissionNo currentClass section fatherName motherName phone email rollNo')
    .lean();
  
  if (!student) {
    return res.status(404).json({
      success: false,
      error: 'Student not found'
    });
  }
  
  // Get all months for this student (for month selector dropdown)
  const allMonths = await Fee.find({ student: studentId })
    .select('month academicYear status dueAmount netAmount paidAmount totalAmount')
    .sort({ academicYear: -1, month: 1 })
    .lean();
  
  // Calculate total due across all months
  const totalDue = allMonths.reduce((sum, fee) => sum + (fee.dueAmount || 0), 0);
  
  // Get current month fee (if specific month requested)
  let currentFee = null;
  if (month && academicYear) {
    currentFee = fees.find(f => f.month === month && f.academicYear === academicYear);
  } else if (fees.length > 0) {
    // Get the most recent fee if no specific month requested
    currentFee = fees[0];
  }
  
  // Process current fee to add computed fields
  if (currentFee) {
    const currentDate = new Date();
    if (currentFee.status !== 'Paid' && new Date(currentFee.dueDate) < currentDate && currentFee.dueAmount > 0) {
      currentFee.status = 'Overdue';
    }
    
    // Calculate late fee if applicable
    if (new Date(currentFee.dueDate) < currentDate && currentFee.status !== 'Paid' && currentFee.status !== 'Cancelled') {
      const daysLate = Math.floor((currentDate - new Date(currentFee.dueDate)) / (1000 * 60 * 60 * 24));
      const lateFeePercentage = Math.min(daysLate / 30 * 0.02, 0.10);
      currentFee.lateFee = Math.round(currentFee.netAmount * lateFeePercentage);
    } else {
      currentFee.lateFee = 0;
    }
    
    // Add full name to student object
    if (currentFee.student) {
      currentFee.student.fullName = `${currentFee.student.firstName || ''} ${currentFee.student.lastName || ''}`.trim();
    }
  }
  
  // Add full name to student object
  const studentWithFullName = {
    ...student,
    fullName: `${student.firstName || ''} ${student.lastName || ''}`.trim()
  };
  
  res.status(200).json({
    success: true,
    data: currentFee,
    student: studentWithFullName,
    allMonths: allMonths.map(month => ({
      month: month.month,
      academicYear: month.academicYear,
      status: month.status,
      dueAmount: month.dueAmount,
      netAmount: month.netAmount,
      paidAmount: month.paidAmount,
      totalAmount: month.totalAmount
    })),
    totalDue: totalDue
  });
});

// @desc    Get overdue fees
// @route   GET /api/v1/fees/overdue
// @access  Private (Admin)
export const getOverdueFees = asyncHandler(async (req, res) => {
  const currentDate = new Date();
  const { class: className, section, academicYear } = req.query;
  
  let query = {
    status: { $in: ['Pending', 'Partially Paid'] },
    dueDate: { $lt: currentDate },
    dueAmount: { $gt: 0 }
  };
  
  // Add class filter if provided
  if (className) {
    const students = await Student.find({ currentClass: className });
    query.student = { $in: students.map(s => s._id) };
  }
  
  // Add section filter if provided
  if (section && className) {
    const students = await Student.find({ currentClass: className, section });
    query.student = { $in: students.map(s => s._id) };
  }
  
  // Add academic year filter if provided
  if (academicYear) {
    query.academicYear = academicYear;
  }
  
  const overdueFees = await Fee.find(query)
    .populate('student', 'firstName lastName admissionNo currentClass section fatherName motherName phone email')
    .populate('createdBy', 'name email')
    .sort({ dueDate: 1 })
    .lean();
  
  // Calculate days overdue and late fees
  const overdueWithDetails = overdueFees.map(fee => {
    const dueDate = new Date(fee.dueDate);
    const daysOverdue = Math.floor((currentDate - dueDate) / (1000 * 60 * 60 * 24));
    
    fee.daysOverdue = daysOverdue;
    fee.lateFee = Math.min(daysOverdue / 30 * 0.02, 0.10) * fee.netAmount;
    fee.totalDueWithLateFee = fee.dueAmount + fee.lateFee;
    
    // Add student full name
    if (fee.student) {
      fee.student.fullName = `${fee.student.firstName} ${fee.student.lastName}`.trim();
    }
    
    return fee;
  });
  
  // Group by class for summary
  const classSummary = {};
  overdueWithDetails.forEach(fee => {
    const className = fee.student?.currentClass || 'Unknown';
    if (!classSummary[className]) {
      classSummary[className] = {
        count: 0,
        totalDue: 0,
        totalLateFees: 0
      };
    }
    classSummary[className].count++;
    classSummary[className].totalDue += fee.dueAmount;
    classSummary[className].totalLateFees += fee.lateFee;
  });
  
  res.status(200).json({
    success: true,
    count: overdueWithDetails.length,
    summary: {
      totalOverdueFees: overdueWithDetails.length,
      totalOverdueAmount: overdueWithDetails.reduce((sum, fee) => sum + fee.dueAmount, 0),
      totalLateFees: overdueWithDetails.reduce((sum, fee) => sum + fee.lateFee, 0),
      byClass: classSummary
    },
    data: overdueWithDetails
  });
});

// @desc    Get single fee
// @route   GET /api/v1/fees/:id
// @access  Private (Admin)
export const getFee = asyncHandler(async (req, res) => {
  const fee = await Fee.findById(req.params.id)
    .populate('student', 'firstName lastName admissionNo currentClass section rollNo fatherName motherName phone email feeStructure')
    .populate('createdBy', 'name email')
    .lean();
  
  if (!fee) {
    return res.status(404).json({
      success: false,
      error: 'Fee record not found'
    });
  }
  
  // Add computed fields
  if (fee.student) {
    fee.student.fullName = `${fee.student.firstName} ${fee.student.lastName}`.trim();
  }
  
  // Calculate late fee
  const currentDate = new Date();
  if (new Date(fee.dueDate) < currentDate && fee.status !== 'Paid' && fee.status !== 'Cancelled') {
    const daysLate = Math.floor((currentDate - new Date(fee.dueDate)) / (1000 * 60 * 60 * 24));
    const lateFeePercentage = Math.min(daysLate / 30 * 0.02, 0.10);
    fee.lateFee = Math.round(fee.netAmount * lateFeePercentage);
  } else {
    fee.lateFee = 0;
  }
  
  res.status(200).json({
    success: true,
    data: fee
  });
});

// @desc    Check if fees already generated for class/month
// @route   GET /api/v1/fees/check-generation
// @access  Private (Admin)
export const checkFeeGeneration = asyncHandler(async (req, res) => {
  const { class: className, month, academicYear, section } = req.query;
  
  if (!className || !month || !academicYear) {
    return res.status(400).json({
      success: false,
      error: 'Please provide class, month, and academicYear'
    });
  }
  
  const query = {
    class: className,
    month,
    academicYear
  };
  
  if (section) {
    query.section = section;
  }
  
  const existingLog = await FeeGenerationLog.findOne(query)
    .populate('generatedBy', 'name email')
    .lean();
  
  res.status(200).json({
    success: true,
    data: {
      alreadyGenerated: !!existingLog,
      generatedAt: existingLog?.generatedAt,
      generatedBy: existingLog?.generatedBy,
      totalStudents: existingLog?.totalStudents,
      totalAmount: existingLog?.totalAmount,
      section: existingLog?.section || 'All'
    }
  });
});

// @desc    Generate fees for a class/month (with duplicate prevention)
// @route   POST /api/v1/fees/generate
// @access  Private (Admin)
// @desc    Generate fees for a class/month (with duplicate prevention)
// @route   POST /api/v1/fees/generate
// @access  Private (Admin)
export const generateFees = asyncHandler(async (req, res) => {
  console.log('📊 POST /api/v1/fees/generate called');
  console.log('Request body:', req.body);
  
  try {
    const { class: className, month, academicYear, dueDate, discountPercentage, section } = req.body;
    
    // Validate required fields
    if (!className || !month || !academicYear) {
      return res.status(400).json({
        success: false,
        error: 'Please provide class, month, and academicYear'
      });
    }
    
    // Check if fees already generated for this class/section/month
    const existingLog = await FeeGenerationLog.findOne({
      class: className,
      section: section || 'All',
      month,
      academicYear
    });
    
    if (existingLog) {
      return res.status(400).json({
        success: false,
        error: `Fees for Class ${className}${section ? ` Section ${section}` : ''} for ${month} ${academicYear} have already been generated on ${format(existingLog.generatedAt, 'PPP')}`
      });
    }
    
    // Get all active students in the class (and section if specified)
    const query = { 
      currentClass: className,
      status: 'Active'
    };
    if (section && section !== 'All') {
      query.section = section;
    }
    
    const students = await Student.find(query);
    
    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No active students found in class ${className}${section ? ` section ${section}` : ''}`
      });
    }
    
    // Get fee structure for the class (base fees)
    let feeStructure = await FeeStructure.findOne({ class: className });
    
    if (!feeStructure) {
      return res.status(400).json({
        success: false,
        error: 'No fee structure found for this class. Please set up fee structure first.'
      });
    }
    
    // Base fee items from class structure
    const baseFeeItems = [
      { itemName: 'Tuition Fee', amount: feeStructure.tuitionFee, isRecurring: true },
      { itemName: 'Examination Fee', amount: feeStructure.examFee || 0, isRecurring: true },
      { itemName: 'Other Charges', amount: feeStructure.otherCharges || 0, isRecurring: true }
    ].filter(item => item.amount > 0);
    
    const totalBaseAmount = baseFeeItems.reduce((sum, item) => sum + item.amount, 0);
    
    // Generate fees for each student based on their INDIVIDUAL fee structure
    const generatedFees = [];
    const skippedStudents = [];
    let totalAmountGenerated = 0;
    
    for (const student of students) {
      // Check if fee already exists for this student/month
      const existingFee = await Fee.findOne({
        student: student._id,
        month,
        academicYear
      });
      
      if (existingFee) {
        skippedStudents.push({
          student: `${student.firstName} ${student.lastName}`,
          admissionNo: student.admissionNo,
          reason: 'Fee already exists for this month'
        });
        continue;
      }
      
      // Get student's individual fee structure (from when they were added)
      const studentFeeStructure = student.feeStructure || {};
      
      // Calculate discount based on student's discount type
      let discountPercent = discountPercentage || 0;
      let discountType = studentFeeStructure.discountType || 'None';
      
      // Override discount percentage if student has specific discount type
      switch (discountType) {
        case 'Orphan':
          discountPercent = 50; // 50% discount for orphans
          break;
        case 'Sibling':
          discountPercent = 20; // 20% discount for siblings
          break;
        case 'Custom':
          discountPercent = studentFeeStructure.discountPercentage || 0;
          break;
        case 'None':
          discountPercent = discountPercentage || 0;
          break;
        default:
          discountPercent = discountPercentage || 0;
      }
      
      // Calculate discount amount and net amount
      const discountAmount = totalBaseAmount * discountPercent / 100;
      const netAmount = totalBaseAmount - discountAmount;
      
      console.log(`Student: ${student.firstName} ${student.lastName}, Discount Type: ${discountType}, Discount: ${discountPercent}%, Net Amount: ${netAmount}`);
      
      // Create fee record for this student with enhanced fee items
      const feeItemsWithTracking = baseFeeItems.map(item => ({
        ...item,
        addedAt: new Date(),
        addedBy: 'System',
        description: `Auto-generated fee for ${month} ${academicYear}`
      }));
      
      // ========== CREATE FEE WITH EMBEDDED STUDENT FIELDS ==========
      const fee = await Fee.create({
        student: student._id,
        // EMBEDDED STUDENT DETAILS (Like attendance!)
        studentName: `${student.firstName} ${student.lastName || ''}`.trim(),
        admissionNo: student.admissionNo,
        studentClass: student.currentClass,
        studentSection: student.section,
        fatherName: student.fatherName,
        // Regular fields
        academicYear,
        month,
        feeItems: feeItemsWithTracking,
        totalAmount: totalBaseAmount,
        discount: discountAmount,
        netAmount: netAmount,
        paidAmount: 0,
        dueAmount: netAmount,
        dueDate: dueDate || new Date(new Date().getFullYear(), new Date().getMonth(), 10),
        status: 'Pending',
        createdBy: req.user.id,
        isGenerated: true
      });
      
      console.log(`✅ Created fee for ${fee.studentName} with amount ${netAmount}`);
      
      generatedFees.push(fee);
      totalAmountGenerated += netAmount;
    }
    
    // Create generation log only if fees were generated
    if (generatedFees.length > 0) {
      await FeeGenerationLog.create({
        class: className,
        section: section || 'All',
        month,
        academicYear,
        generatedBy: req.user.id,
        totalStudents: generatedFees.length,
        totalAmount: totalAmountGenerated
      });
    }
    
    const summary = {
      totalGenerated: generatedFees.length,
      totalAmount: totalAmountGenerated,
      studentsProcessed: students.length,
      skippedCount: skippedStudents.length,
      skippedStudents: skippedStudents
    };
    
    res.status(201).json({
      success: true,
      message: `Generated fees for ${generatedFees.length} students in Class ${className}${section ? ` Section ${section}` : ''} for ${month} ${academicYear}`,
      data: summary
    });
    
  } catch (error) {
    console.error('❌ Error in generateFees:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate fees'
    });
  }
});

// @desc    Bulk generate fees for multiple students
// @route   POST /api/v1/fees/bulk-generate
// @access  Private (Admin)
export const bulkGenerateFees = asyncHandler(async (req, res) => {
  console.log('📊 POST /api/v1/fees/bulk-generate called');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  
  const { class: className, section, month, academicYear, fees } = req.body;
  
  // Validate required fields
  if (!className || !month || !academicYear || !fees || fees.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Please provide class, month, academicYear, and fees data'
    });
  }
  
  const savedFees = [];
  const updatedFees = [];
  const errors = [];
  
  for (const feeData of fees) {
    try {
      // Calculate dueAmount
      const dueAmount = feeData.netAmount - (feeData.paidAmount || 0);
      
      // Prepare fee data with all required fields
      // Prepare fee data with all required fields - ADD EMBEDDED FIELDS
const completeFeeData = {
  student: feeData.student,
  // EMBEDDED STUDENT DETAILS
  studentName: feeData.studentName || '',
  admissionNo: feeData.admissionNo || '',
  studentClass: feeData.studentClass || '',
  studentSection: feeData.studentSection || '',
  fatherName: feeData.fatherName || '',
  // Regular fields
  academicYear: feeData.academicYear,
  month: feeData.month,
  feeItems: feeData.feeItems,
  totalAmount: feeData.totalAmount,
  discount: feeData.discount || 0,
  netAmount: feeData.netAmount,
  paidAmount: feeData.paidAmount || 0,
  dueAmount: dueAmount,
  dueDate: feeData.dueDate,
  status: feeData.status || 'Pending',
  paymentHistory: [],
  remarks: feeData.remarks || '',
  createdBy: req.user.id,
  isGenerated: true
};
      
      // Check if fee already exists for this student and month
      const existingFee = await Fee.findOne({
        student: feeData.student,
        month: feeData.month,
        academicYear: feeData.academicYear
      });
      
      if (existingFee) {
        // Update existing fee - only add new charges that don't exist
        const existingItems = existingFee.feeItems;
        const newItems = feeData.feeItems;
        
        // Merge items, avoiding duplicates
        const mergedItems = [...existingItems];
        for (const newItem of newItems) {
          const exists = mergedItems.some(item => item.itemName === newItem.itemName);
          if (!exists) {
            mergedItems.push(newItem);
          }
        }
        
        existingFee.feeItems = mergedItems;
        existingFee.totalAmount = mergedItems.reduce((sum, item) => sum + item.amount, 0);
        existingFee.netAmount = existingFee.totalAmount - existingFee.discount;
        existingFee.dueAmount = existingFee.netAmount - existingFee.paidAmount;
        
        // Update status based on payment
        if (existingFee.paidAmount >= existingFee.netAmount) {
          existingFee.status = 'Paid';
        } else if (existingFee.paidAmount > 0) {
          existingFee.status = 'Partially Paid';
        } else if (new Date() > existingFee.dueDate) {
          existingFee.status = 'Overdue';
        } else {
          existingFee.status = 'Pending';
        }
        
        await existingFee.save();
        updatedFees.push(existingFee);
        console.log(`Updated fee for student ${feeData.student}`);
      } else {
        // Create new fee
        const fee = await Fee.create(completeFeeData);
        savedFees.push(fee);
        console.log(`Created new fee for student ${feeData.student}`);
      }
    } catch (error) {
      console.error(`Error processing fee for student ${feeData.student}:`, error);
      errors.push({
        student: feeData.student,
        error: error.message
      });
    }
  }
  
  // Create generation log if any fees were processed
  if (savedFees.length > 0 || updatedFees.length > 0) {
    const totalAmount = [...savedFees, ...updatedFees].reduce((sum, f) => sum + f.netAmount, 0);
    
    await FeeGenerationLog.create({
      class: className,
      section: section || 'All',
      month,
      academicYear,
      generatedBy: req.user.id,
      totalStudents: savedFees.length + updatedFees.length,
      totalAmount: totalAmount
    });
  }
  
  res.status(201).json({
    success: true,
    message: `Processed fees: ${savedFees.length} new, ${updatedFees.length} updated`,
    data: {
      new: savedFees.length,
      updated: updatedFees.length,
      errors: errors.length > 0 ? errors : undefined
    }
  });
});

// @desc    Add custom fee item to individual student (Enhanced)
// @route   POST /api/v1/fees/:id/add-item
// @access  Private (Admin)
export const addCustomFeeItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { itemName, amount, isRecurring, description } = req.body;
  
  // Validate inputs
  if (!itemName || !itemName.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Please provide a valid item name'
    });
  }
  
  if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Please provide a valid amount greater than 0'
    });
  }
  
  const fee = await Fee.findById(id);
  
  if (!fee) {
    return res.status(404).json({
      success: false,
      error: 'Fee record not found'
    });
  }
  
  // Check if fee is already fully paid
  if (fee.status === 'Paid') {
    return res.status(400).json({
      success: false,
      error: 'Cannot add items to a fully paid fee record'
    });
  }
  
  // Check if item with same name already exists (optional - to prevent duplicates)
  const existingItem = fee.feeItems.find(item => 
    item.itemName.toLowerCase() === itemName.toLowerCase()
  );
  
  if (existingItem) {
    return res.status(400).json({
      success: false,
      error: `Item "${itemName}" already exists in this fee record. Please edit the existing item instead.`
    });
  }
  
  const numericAmount = parseFloat(amount);
  const timestamp = new Date();
  const addedBy = req.user?.name || req.user?.email || 'Admin';
  
  // Add custom fee item with tracking
  fee.feeItems.push({
    itemName: itemName.trim(),
    amount: numericAmount,
    isRecurring: isRecurring || false,
    addedAt: timestamp,
    addedBy: addedBy,
    description: description || `Added on ${format(timestamp, 'PPP p')}`
  });
  
  // Recalculate totals
  const previousTotal = fee.totalAmount;
  const previousNet = fee.netAmount;
  
  fee.totalAmount = fee.feeItems.reduce((sum, item) => sum + item.amount, 0);
  fee.netAmount = fee.totalAmount - fee.discount;
  fee.dueAmount = fee.netAmount - fee.paidAmount;
  
  // Update status if needed
  const currentDate = new Date();
  if (fee.dueAmount <= 0) {
    fee.status = 'Paid';
  } else if (fee.paidAmount > 0) {
    fee.status = 'Partially Paid';
  } else if (currentDate > fee.dueDate && fee.dueAmount > 0) {
    fee.status = 'Overdue';
  }
  
  await fee.save();
  
  // Populate student data before sending response
  await fee.populate('student', 'firstName lastName admissionNo currentClass section');
  
  res.status(200).json({
    success: true,
    data: fee,
    message: `${itemName.trim()} of Rs. ${numericAmount.toLocaleString()} added successfully on ${format(timestamp, 'PPP p')}`,
    summary: {
      previousTotal: previousTotal,
      newTotal: fee.totalAmount,
      previousNet: previousNet,
      newNet: fee.netAmount,
      dueAmount: fee.dueAmount
    }
  });
});

// @desc    Update fee record
// @route   PUT /api/v1/fees/:id
// @access  Private (Admin)
export const updateFee = asyncHandler(async (req, res) => {
  const { discount, dueDate, remarks, feeItems, discountType, discountPercentage } = req.body;
  
  let fee = await Fee.findById(req.params.id);
  
  if (!fee) {
    return res.status(404).json({
      success: false,
      error: 'Fee record not found'
    });
  }
  
  // Check if fee is already paid
  if (fee.status === 'Paid' && (discount !== undefined || feeItems)) {
    return res.status(400).json({
      success: false,
      error: 'Cannot modify a fully paid fee record'
    });
  }
  
  // Update fields
  if (discount !== undefined && !isNaN(parseFloat(discount))) {
    fee.discount = parseFloat(discount);
    fee.netAmount = fee.totalAmount - fee.discount;
    fee.dueAmount = fee.netAmount - fee.paidAmount;
  }
  
  if (dueDate) fee.dueDate = dueDate;
  if (remarks) fee.remarks = remarks;
  if (feeItems) fee.feeItems = feeItems;
  
  // Update discount type and percentage if provided
  if (discountType !== undefined || discountPercentage !== undefined) {
    const student = await Student.findById(fee.student);
    if (student) {
      if (!student.feeStructure) student.feeStructure = {};
      if (discountType !== undefined) student.feeStructure.discountType = discountType;
      if (discountPercentage !== undefined) student.feeStructure.discountPercentage = parseFloat(discountPercentage);
      await student.save();
    }
  }
  
  await fee.save();
  
  // Populate student data before sending response
  await fee.populate('student', 'firstName lastName admissionNo currentClass section');
  
  res.status(200).json({
    success: true,
    data: fee,
    message: 'Fee record updated successfully'
  });
});

// @desc    Delete fee record
// @route   DELETE /api/v1/fees/:id
// @access  Private (Admin)
export const deleteFee = asyncHandler(async (req, res) => {
  const fee = await Fee.findById(req.params.id);
  
  if (!fee) {
    return res.status(404).json({
      success: false,
      error: 'Fee record not found'
    });
  }
  
  // Check if payments exist
  if (fee.paidAmount > 0) {
    return res.status(400).json({
      success: false,
      error: 'Cannot delete fee record with payments. Refund or adjust payments first.'
    });
  }
  
  await fee.deleteOne();
  
  res.status(200).json({
    success: true,
    data: {},
    message: 'Fee record deleted successfully'
  });
});

// @desc    Get fee summary/stats
// @route   GET /api/v1/fees/stats/summary
// @access  Private (Admin)
export const getFeeSummary = asyncHandler(async (req, res) => {
  const { academicYear, class: className } = req.query;
  
  let query = {};
  if (academicYear) query.academicYear = academicYear;
  if (className) {
    const students = await Student.find({ currentClass: className });
    query.student = { $in: students.map(s => s._id) };
  }
  
  const fees = await Fee.find(query)
    .populate({
      path: 'student',
      select: 'firstName lastName admissionNo currentClass section rollNo fatherName motherName phone email feeStructure'
    })
    .populate('createdBy', 'name email')
    .lean();
  
  const totalGenerated = fees.reduce((sum, fee) => sum + fee.netAmount, 0);
  const totalPaid = fees.reduce((sum, fee) => sum + fee.paidAmount, 0);
  const totalDue = fees.reduce((sum, fee) => sum + fee.dueAmount, 0);
  
  const statusCounts = {
    Paid: fees.filter(f => f.status === 'Paid').length,
    Pending: fees.filter(f => f.status === 'Pending').length,
    'Partially Paid': fees.filter(f => f.status === 'Partially Paid').length,
    Overdue: fees.filter(f => f.status === 'Overdue').length
  };
  
  const monthlyData = {};
  fees.forEach(fee => {
    if (!monthlyData[fee.month]) {
      monthlyData[fee.month] = { generated: 0, paid: 0, due: 0, count: 0 };
    }
    monthlyData[fee.month].generated += fee.netAmount;
    monthlyData[fee.month].paid += fee.paidAmount;
    monthlyData[fee.month].due += fee.dueAmount;
    monthlyData[fee.month].count += 1;
  });
  
  // Get generation logs for tracking
  const generationLogs = await FeeGenerationLog.find(academicYear ? { academicYear } : {})
    .populate('generatedBy', 'name email')
    .sort({ generatedAt: -1 })
    .lean();
  
  res.status(200).json({
    success: true,
    data: {
      totalGenerated,
      totalPaid,
      totalDue,
      collectionRate: totalGenerated > 0 ? (totalPaid / totalGenerated * 100).toFixed(2) : 0,
      statusCounts,
      monthlyData,
      generationLogs
    }
  });
});

// @desc    Get fee generation logs
// @route   GET /api/v1/fees/generation-logs
// @access  Private (Admin)
export const getFeeGenerationLogs = asyncHandler(async (req, res) => {
  const { academicYear, class: className, section } = req.query;
  
  let query = {};
  if (academicYear) query.academicYear = academicYear;
  if (className) query.class = className;
  if (section) query.section = section;
  
  const logs = await FeeGenerationLog.find(query)
    .populate('generatedBy', 'name email')
    .sort({ generatedAt: -1 })
    .lean();
  
  res.status(200).json({
    success: true,
    count: logs.length,
    data: logs
  });
});