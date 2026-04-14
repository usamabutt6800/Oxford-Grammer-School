// server/src/modules/siblings/controllers/siblingController.js
import Student from '../../students/models/Student.js';
import Fee from '../../fees/models/Fee.js';
import Payment from '../../payments/models/Payment.js';
import asyncHandler from '../../../middlewares/asyncHandler.js';
import { format } from 'date-fns';
import mongoose from 'mongoose';

const classOrder = ['Play Group', 'Nursery', 'Prep', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
const getClassRank = (cls) => { const i = classOrder.indexOf(cls); return i === -1 ? 99 : i; };

// @desc    Get all sibling groups with combined fee stats
// @route   GET /api/v1/siblings
// @access  Private (Admin)
export const getSiblingGroups = asyncHandler(async (req, res) => {
  const { month, academicYear } = req.query;

  // Find all active students grouped by fatherName + fatherPhone
  const students = await Student.find({ status: 'Active' })
    .select('firstName lastName admissionNo rollNo currentClass section fatherName fatherPhone feeStructure')
    .lean();

  // Group by fatherName + fatherPhone (normalized)
  const groups = {};
  for (const student of students) {
    const fatherName = (student.fatherName || '').trim().toLowerCase();
    const fatherPhone = (student.fatherPhone || '').trim().replace(/\s+/g, '');
    if (!fatherName || !fatherPhone) continue;
    const key = `${fatherName}||${fatherPhone}`;
    if (!groups[key]) {
      groups[key] = {
        fatherName: student.fatherName,
        fatherPhone: student.fatherPhone,
        students: [],
      };
    }
    groups[key].students.push(student);
  }

  // Keep only groups with 2+ siblings
  const siblingGroups = Object.values(groups).filter(g => g.students.length >= 2);

  // For each group fetch fee data if month/year requested
  const result = await Promise.all(siblingGroups.map(async (group) => {
    const studentIds = group.students.map(s => s._id);

    let feeQuery = { student: { $in: studentIds } };
    if (month) feeQuery.month = month;
    if (academicYear) feeQuery.academicYear = academicYear;

    // Use find without triggering auto-populate pre hooks
    const fees = await Fee.find(feeQuery)
      .populate('student', 'firstName lastName admissionNo currentClass section fatherName feeStructure')
      .lean();

    // Map fees to student ID — fee.student is a populated object after .populate()
    const feeByStudent = {};
    fees.forEach(fee => {
      const sid = (fee.student?._id || fee.student).toString();
      if (!feeByStudent[sid]) feeByStudent[sid] = [];
      feeByStudent[sid].push(fee);
    });

    let totalDue = 0, totalPaid = 0, totalNet = 0;
    fees.forEach(f => {
      totalNet += f.netAmount || 0;
      totalPaid += f.paidAmount || 0;
      totalDue += f.dueAmount || 0;
    });

    // Sort students by class (highest first for payment priority)
    const sortedStudents = [...group.students].sort(
      (a, b) => getClassRank(b.currentClass) - getClassRank(a.currentClass)
    );

    return {
      groupKey: `${group.fatherName}||${group.fatherPhone}`,
      fatherName: group.fatherName,
      fatherPhone: group.fatherPhone,
      siblingCount: group.students.length,
      students: sortedStudents,
      fees: feeByStudent,
      summary: { totalNet, totalPaid, totalDue, status: totalDue <= 0 ? 'Paid' : totalPaid > 0 ? 'Partially Paid' : 'Pending' }
    };
  }));

  // Sort groups: those with dues first
  result.sort((a, b) => b.summary.totalDue - a.summary.totalDue);

  res.status(200).json({
    success: true,
    count: result.length,
    stats: {
      totalGroups: result.length,
      totalSiblings: result.reduce((s, g) => s + g.siblingCount, 0),
      totalDue: result.reduce((s, g) => s + g.summary.totalDue, 0),
      totalPaid: result.reduce((s, g) => s + g.summary.totalPaid, 0),
    },
    data: result,
  });
});

// @desc    Get single sibling group detail with full fee breakdown
// @route   GET /api/v1/siblings/group
// @access  Private (Admin)
export const getSiblingGroupDetail = asyncHandler(async (req, res) => {
  const { fatherName, fatherPhone, month, academicYear } = req.query;

  if (!fatherName || !fatherPhone) {
    return res.status(400).json({ success: false, error: 'fatherName and fatherPhone required' });
  }

  const students = await Student.find({
    fatherName: { $regex: new RegExp(`^${fatherName.trim()}$`, 'i') },
    fatherPhone: fatherPhone.trim(),
    status: 'Active',
  }).lean();

  if (students.length === 0) {
    return res.status(404).json({ success: false, error: 'No siblings found' });
  }

  const studentIds = students.map(s => s._id);
  let feeQuery = { student: { $in: studentIds } };
  if (month) feeQuery.month = month;
  if (academicYear) feeQuery.academicYear = academicYear;

  const fees = await Fee.find(feeQuery)
    .populate('student', 'firstName lastName admissionNo currentClass section fatherName fatherPhone feeStructure')
    .lean();

  // Sort students highest class first (payment priority)
  const sortedStudents = [...students].sort(
    (a, b) => getClassRank(b.currentClass) - getClassRank(a.currentClass)
  );

  // Group fees by student
  const feesByStudent = {};
  sortedStudents.forEach(s => { feesByStudent[s._id.toString()] = []; });
  fees.forEach(fee => {
    const sid = fee.student?._id?.toString() || fee.student?.toString();
    if (sid && feesByStudent[sid]) feesByStudent[sid].push(fee);
  });

  // Build detail per student
  const studentDetails = sortedStudents.map(student => {
    const studentFees = feesByStudent[student._id.toString()] || [];
    const totalNet = studentFees.reduce((s, f) => s + (f.netAmount || 0), 0);
    const totalPaid = studentFees.reduce((s, f) => s + (f.paidAmount || 0), 0);
    const totalDue = studentFees.reduce((s, f) => s + (f.dueAmount || 0), 0);
    return {
      ...student,
      fullName: `${student.firstName} ${student.lastName || ''}`.trim(),
      fees: studentFees,
      summary: { totalNet, totalPaid, totalDue },
      classRank: getClassRank(student.currentClass),
    };
  });

  const groupTotal = {
    net: studentDetails.reduce((s, st) => s + st.summary.totalNet, 0),
    paid: studentDetails.reduce((s, st) => s + st.summary.totalPaid, 0),
    due: studentDetails.reduce((s, st) => s + st.summary.totalDue, 0),
  };

  res.status(200).json({
    success: true,
    data: {
      fatherName,
      fatherPhone,
      siblingCount: students.length,
      students: studentDetails,
      groupTotal,
    },
  });
});

// @desc    Smart sibling payment — distributes across siblings, highest class first
// @route   POST /api/v1/siblings/pay
// @access  Private (Admin)
export const siblingPayment = asyncHandler(async (req, res) => {
  const { fatherName, fatherPhone, totalAmount, month, academicYear, paymentMode, remarks } = req.body;

  if (!fatherName || !fatherPhone || !totalAmount || totalAmount <= 0) {
    return res.status(400).json({ success: false, error: 'fatherName, fatherPhone, and totalAmount are required' });
  }
  if (!month || !academicYear) {
    return res.status(400).json({ success: false, error: 'month and academicYear are required' });
  }

  // Get all siblings
  const students = await Student.find({
    fatherName: { $regex: new RegExp(`^${fatherName.trim()}$`, 'i') },
    fatherPhone: fatherPhone.trim(),
    status: 'Active',
  }).lean();

  if (students.length === 0) {
    return res.status(404).json({ success: false, error: 'No siblings found' });
  }

  // Get fee records for this month sorted highest class first (pay senior students first)
  const studentIds = students.map(s => s._id);
  const fees = await Fee.find({
    student: { $in: studentIds },
    month,
    academicYear,
    dueAmount: { $gt: 0 },
  }).populate('student', 'firstName lastName admissionNo currentClass section fatherName').lean();

  // Sort fees: lowest class first (youngest student paid first), then by due amount
  fees.sort((a, b) => {
    const rankA = getClassRank(a.student?.currentClass || '');
    const rankB = getClassRank(b.student?.currentClass || '');
    if (rankA !== rankB) return rankA - rankB;
    return b.dueAmount - a.dueAmount;
  });

  const totalDue = fees.reduce((s, f) => s + f.dueAmount, 0);
  if (totalAmount > totalDue) {
    return res.status(400).json({
      success: false,
      error: `Payment amount Rs. ${totalAmount.toLocaleString()} exceeds total due Rs. ${totalDue.toLocaleString()}`
    });
  }

  // Distribute payment
  let remaining = totalAmount;
  const distributions = [];
  const receiptBase = `SIBLING-${Date.now()}`;

  for (const fee of fees) {
    if (remaining <= 0) break;
    const payThis = Math.min(remaining, fee.dueAmount);
    if (payThis <= 0) continue;

    const receiptNumber = `${receiptBase}-${distributions.length + 1}`;
    const transactionId = `TXN-SIB-${Date.now()}-${distributions.length}`;
    const paymentDate = new Date();
    const studentDoc = fee.student;
    const studentName = studentDoc ? `${studentDoc.firstName} ${studentDoc.lastName || ''}`.trim() : '';

    // Create Payment document
    const paymentDoc = await Payment.create({
      fee: fee._id,
      student: fee.student._id,
      studentName,
      admissionNo: studentDoc?.admissionNo || '',
      studentClass: studentDoc?.currentClass || '',
      studentSection: studentDoc?.section || '',
      fatherName: fatherName,
      month,
      academicYear,
      amount: payThis,
      paymentDate,
      paymentMode: paymentMode || 'Cash',
      transactionId,
      receiptNumber,
      receivedBy: req.user._id,
      remarks: remarks || `Sibling group payment for ${month} ${academicYear}`,
      isVerified: true,
      verifiedBy: req.user._id,
      verificationDate: paymentDate,
    });

    // Update Fee document
    const feeDoc = await Fee.findById(fee._id);
    feeDoc.paymentHistory.push({
      paymentId: paymentDoc._id,
      amount: payThis,
      date: paymentDate,
      paymentMode: paymentMode || 'Cash',
      transactionId,
      receiptNumber,
      remarks: remarks || `Sibling group payment`,
      paidBy: req.user?.name || 'Admin',
      paymentFor: { month, year: academicYear, description: `Sibling payment - ${month} ${academicYear}` },
    });

    feeDoc.paidAmount += payThis;
    feeDoc.dueAmount = feeDoc.netAmount - feeDoc.paidAmount;
    if (feeDoc.paidAmount >= feeDoc.netAmount) feeDoc.status = 'Paid';
    else if (feeDoc.paidAmount > 0) feeDoc.status = 'Partially Paid';
    await feeDoc.save();

    distributions.push({
      studentName,
      admissionNo: studentDoc?.admissionNo,
      class: studentDoc?.currentClass,
      section: studentDoc?.section,
      amountPaid: payThis,
      remainingDue: feeDoc.dueAmount,
      status: feeDoc.status,
      receiptNumber,
    });

    remaining -= payThis;
  }

  res.status(200).json({
    success: true,
    message: `Rs. ${totalAmount.toLocaleString()} distributed across ${distributions.length} sibling(s)`,
    data: {
      totalPaid: totalAmount,
      remainingUnpaid: remaining,
      distributions,
      paymentDate: new Date(),
      groupReceiptRef: receiptBase,
    },
  });
});