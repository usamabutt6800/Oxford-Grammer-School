// server/src/modules/payments/controllers/paymentController.js

import Fee from '../../fees/models/Fee.js';
import Payment from '../models/Payment.js';
import Student from '../../students/models/Student.js';
import asyncHandler from '../../../middlewares/asyncHandler.js';
import { format } from 'date-fns';
import mongoose from 'mongoose';

// @desc    Create a payment
// @route   POST /api/v1/payments/create
// @access  Private (Admin)
export const createPayment = asyncHandler(async (req, res) => {
  console.log('📊 POST /api/v1/payments/create called');
  console.log('Request body:', req.body);
  
  const { feeId, amount, paymentMode, paymentFor, remarks } = req.body;
  
  if (!feeId || !amount || amount <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Please provide valid feeId and amount'
    });
  }
  
  // Find the fee record and populate student details
  const fee = await Fee.findById(feeId).populate('student', 'firstName lastName admissionNo currentClass section fatherName motherName phone email');
  
  if (!fee) {
    return res.status(404).json({
      success: false,
      error: 'Fee record not found'
    });
  }
  
  // Check if amount exceeds due amount
  if (amount > fee.dueAmount) {
    return res.status(400).json({
      success: false,
      error: `Payment amount cannot exceed due amount of Rs. ${fee.dueAmount.toLocaleString()}`
    });
  }
  
  // Generate unique receipt number
  const receiptNumber = `RCPT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const transactionId = `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const paymentDate = new Date();
  
  // Get student details for embedded fields
  const studentDetails = fee.student || await Student.findById(fee.student);
  const studentName = studentDetails ? `${studentDetails.firstName} ${studentDetails.lastName || ''}`.trim() : 'Unknown';
  const admissionNo = studentDetails?.admissionNo || '';
  const studentClass = studentDetails?.currentClass || '';
  const studentSection = studentDetails?.section || '';
  const fatherNameValue = studentDetails?.fatherName || '';
  
  // 1. CREATE SEPARATE PAYMENT DOCUMENT IN Payment COLLECTION WITH EMBEDDED STUDENT FIELDS
  const paymentDoc = await Payment.create({
    fee: fee._id,
    student: fee.student._id,
    // ========== EMBEDDED STUDENT DETAILS (Like attendance!) ==========
    studentName: studentName,
    admissionNo: admissionNo,
    studentClass: studentClass,
    studentSection: studentSection,
    fatherName: fatherNameValue,
    month: fee.month,
    academicYear: fee.academicYear,
    // ========== End of embedded fields ==========
    amount: amount,
    paymentDate: paymentDate,
    paymentMode: paymentMode || 'Cash',
    transactionId: transactionId,
    receiptNumber: receiptNumber,
    receivedBy: req.user.id,
    remarks: remarks || `Payment for ${fee.month} ${fee.academicYear}`,
    isVerified: true,
    verifiedBy: req.user.id,
    verificationDate: paymentDate
  });
  
  console.log('✅ Payment document created:', {
    paymentId: paymentDoc._id,
    receiptNumber: receiptNumber,
    amount: amount,
    student: studentName
  });
  
  // Also update the fee with embedded student details if missing
  if (!fee.studentName) {
    fee.studentName = studentName;
    fee.admissionNo = admissionNo;
    fee.studentClass = studentClass;
    fee.studentSection = studentSection;
    fee.fatherName = fatherNameValue;
    await fee.save();
  }
  
  // 2. UPDATE FEE MODEL WITH PAYMENT HISTORY
  const paymentRecord = {
    paymentId: paymentDoc._id,
    amount: amount,
    date: paymentDate,
    paymentMode: paymentMode || 'Cash',
    transactionId: transactionId,
    receiptNumber: receiptNumber,
    remarks: remarks || '',
    paidBy: req.user?.name || req.user?.email || 'Admin',
    paymentFor: {
      month: fee.month,
      year: fee.academicYear,
      description: paymentFor || `Payment for ${fee.month} ${fee.academicYear}`
    }
  };
  
  fee.paymentHistory.push(paymentRecord);
  
  // Update fee amounts
  const previousPaidAmount = fee.paidAmount;
  fee.paidAmount += amount;
  fee.dueAmount = fee.netAmount - fee.paidAmount;
  
  // Update status
  if (fee.paidAmount >= fee.netAmount) {
    fee.status = 'Paid';
  } else if (fee.paidAmount > 0) {
    fee.status = 'Partially Paid';
  } else if (new Date() > fee.dueDate && fee.dueAmount > 0) {
    fee.status = 'Overdue';
  }
  
  await fee.save();
  
  console.log('✅ Fee record updated:', {
    feeId: fee._id,
    previousPaid: previousPaidAmount,
    newPaid: fee.paidAmount,
    dueAmount: fee.dueAmount,
    status: fee.status
  });
  
  res.status(200).json({
    success: true,
    message: `Payment of Rs. ${amount.toLocaleString()} recorded successfully`,
    data: {
      payment: {
        _id: paymentDoc._id,
        receiptNumber: receiptNumber,
        transactionId: transactionId,
        amount: amount,
        paymentMode: paymentMode || 'Cash',
        date: paymentDate,
        remarks: remarks || '',
        paymentFor: paymentFor || `${fee.month} ${fee.academicYear}`
      },
      fee: {
        _id: fee._id,
        student: fee.student,
        month: fee.month,
        academicYear: fee.academicYear,
        netAmount: fee.netAmount,
        paidAmount: fee.paidAmount,
        dueAmount: fee.dueAmount,
        status: fee.status
      }
    }
  });
});

// @desc    Get payment history for a student - KEEP EXACT SAME FORMAT AS BEFORE
// @route   GET /api/v1/payments/student/:studentId
// @access  Private (Admin, Teacher)
export const getStudentPaymentHistory = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  
  console.log('📊 Fetching payment history for student:', studentId);
  
  // Get the student's fees with payment history - THIS IS WHAT THE FRONTEND EXPECTS
  const fees = await Fee.find({ student: studentId })
    .populate('student', 'firstName lastName admissionNo currentClass section')
    .sort({ createdAt: -1 });
  
  console.log(`Found ${fees.length} fee records`);
  
  // Build payment history array in the EXACT format the frontend expects
  const paymentHistory = [];
  
  fees.forEach(fee => {
    fee.paymentHistory.forEach(payment => {
      paymentHistory.push({
        _id: payment.paymentId || payment._id,
        receiptNumber: payment.receiptNumber,
        transactionId: payment.transactionId,
        amount: payment.amount,
        paymentMode: payment.paymentMode,
        date: payment.date,
        remarks: payment.remarks,
        month: fee.month,
        academicYear: fee.academicYear,
        feeId: fee._id,
        studentName: fee.student ? `${fee.student.firstName} ${fee.student.lastName}` : (fee.studentName || 'Unknown'),
        admissionNo: fee.student?.admissionNo || fee.admissionNo,
        class: fee.student ? `${fee.student.currentClass}-${fee.student.section}` : (fee.studentClass ? `${fee.studentClass}-${fee.studentSection}` : 'N/A'),
        totalFee: fee.netAmount,
        paidAmount: fee.paidAmount,
        dueAmount: fee.dueAmount
      });
    });
  });
  
  // Sort by date descending (newest first)
  paymentHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  console.log(`Returning ${paymentHistory.length} payment records`);
  
  res.status(200).json({
    success: true,
    count: paymentHistory.length,
    data: paymentHistory
  });
});

// @desc    Get all payments with filters - KEEP EXACT SAME FORMAT
// @route   GET /api/v1/payments
// @access  Private (Admin)
export const getAllPayments = asyncHandler(async (req, res) => {
  const { studentId, month, academicYear, startDate, endDate } = req.query;
  
  let query = {};
  if (studentId) query.student = studentId;
  if (startDate || endDate) {
    query.paymentDate = {};
    if (startDate) query.paymentDate.$gte = new Date(startDate);
    if (endDate) query.paymentDate.$lte = new Date(endDate);
  }
  
  // Get fees with payment history - this is what the frontend expects
  let feeQuery = {};
  if (studentId) feeQuery.student = studentId;
  if (month) feeQuery.month = month;
  if (academicYear) feeQuery.academicYear = academicYear;
  
  const fees = await Fee.find(feeQuery)
    .populate('student', 'firstName lastName admissionNo currentClass section fatherName')
    .sort({ createdAt: -1 });
  
  const allPayments = [];
  fees.forEach(fee => {
    fee.paymentHistory.forEach(payment => {
      // Apply date filters if provided
      if (startDate && new Date(payment.date) < new Date(startDate)) return;
      if (endDate && new Date(payment.date) > new Date(endDate)) return;
      
      allPayments.push({
        _id: payment.paymentId || payment._id,
        receiptNumber: payment.receiptNumber,
        transactionId: payment.transactionId,
        amount: payment.amount,
        paymentMode: payment.paymentMode,
        date: payment.date,
        remarks: payment.remarks,
        month: fee.month,
        academicYear: fee.academicYear,
        studentName: fee.student ? `${fee.student.firstName} ${fee.student.lastName}` : (fee.studentName || 'Unknown'),
        admissionNo: fee.student?.admissionNo || fee.admissionNo,
        class: fee.student ? `${fee.student.currentClass}-${fee.student.section}` : (fee.studentClass ? `${fee.studentClass}-${fee.studentSection}` : 'N/A'),
        fatherName: fee.student?.fatherName || fee.fatherName,
        totalFee: fee.netAmount,
        paidAmount: fee.paidAmount,
        dueAmount: fee.dueAmount
      });
    });
  });
  
  // Sort by date descending
  allPayments.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  res.status(200).json({
    success: true,
    count: allPayments.length,
    data: allPayments
  });
});

// @desc    Get payment by ID
// @route   GET /api/v1/payments/:id
// @access  Private (Admin)
export const getPaymentById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Find which fee contains this payment
  const fee = await Fee.findOne({ 'paymentHistory.paymentId': id })
    .populate('student', 'firstName lastName admissionNo currentClass section fatherName motherName phone email');
  
  if (!fee) {
    return res.status(404).json({
      success: false,
      error: 'Payment not found'
    });
  }
  
  const payment = fee.paymentHistory.find(p => p.paymentId && p.paymentId.toString() === id);
  
  res.status(200).json({
    success: true,
    data: {
      ...payment.toObject(),
      student: fee.student || {
        firstName: fee.studentName?.split(' ')[0] || '',
        lastName: fee.studentName?.split(' ')[1] || '',
        admissionNo: fee.admissionNo,
        currentClass: fee.studentClass,
        section: fee.studentSection,
        fatherName: fee.fatherName
      },
      month: fee.month,
      academicYear: fee.academicYear,
      feeId: fee._id,
      totalFee: fee.netAmount,
      paidAmount: fee.paidAmount,
      dueAmount: fee.dueAmount
    }
  });
});

// @desc    Get payment summary/dashboard stats
// @route   GET /api/v1/payments/summary
// @access  Private (Admin)
export const getPaymentSummary = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  
  // Build query for fees with payment history
  let feeQuery = {};
  
  const fees = await Fee.find(feeQuery).populate('student', 'firstName lastName');
  
  let allPayments = [];
  fees.forEach(fee => {
    fee.paymentHistory.forEach(payment => {
      if (startDate && new Date(payment.date) < new Date(startDate)) return;
      if (endDate && new Date(payment.date) > new Date(endDate)) return;
      allPayments.push(payment);
    });
  });
  
  const totalCollected = allPayments.reduce((sum, p) => sum + p.amount, 0);
  const paymentsByMode = {
    Cash: allPayments.filter(p => p.paymentMode === 'Cash').reduce((sum, p) => sum + p.amount, 0),
    'Bank Transfer': allPayments.filter(p => p.paymentMode === 'Bank Transfer').reduce((sum, p) => sum + p.amount, 0),
    Cheque: allPayments.filter(p => p.paymentMode === 'Cheque').reduce((sum, p) => sum + p.amount, 0),
    Online: allPayments.filter(p => p.paymentMode === 'Online').reduce((sum, p) => sum + p.amount, 0),
    Other: allPayments.filter(p => p.paymentMode === 'Other').reduce((sum, p) => sum + p.amount, 0)
  };
  
  // Daily collection for the last 30 days
  const last30Days = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    const nextDate = new Date(date);
    nextDate.setDate(date.getDate() + 1);
    
    const dayPayments = allPayments.filter(p => 
      new Date(p.date) >= date && new Date(p.date) < nextDate
    );
    
    last30Days.push({
      date: format(date, 'dd MMM'),
      amount: dayPayments.reduce((sum, p) => sum + p.amount, 0),
      count: dayPayments.length
    });
  }
  
  res.status(200).json({
    success: true,
    data: {
      totalCollected,
      totalTransactions: allPayments.length,
      averagePayment: allPayments.length > 0 ? totalCollected / allPayments.length : 0,
      paymentsByMode,
      dailyCollection: last30Days
    }
  });
});