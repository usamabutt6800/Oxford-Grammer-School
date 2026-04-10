// server/src/modules/students/controllers/promotionController.js
// Handles end-of-year student promotion to the next class.
// Fee amounts are NOT stored here — they come from FeeStructure at generation time.
// Only the student's discount is preserved across promotion.

import Student from '../models/Student.js';
import FeeStructure from '../../fees/models/FeeStructure.js';
import asyncHandler from '../../../middlewares/asyncHandler.js';

const classOrder = ['Play Group', 'Nursery', 'Prep', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

// Helper: get the next class
const getNextClass = (currentClass) => {
  const index = classOrder.indexOf(currentClass);
  if (index === -1 || index === classOrder.length - 1) return null;
  return classOrder[index + 1];
};

// @desc    Preview promotion — shows what each student will move to + new fees
// @route   GET /api/v1/students/promotion/preview
// @access  Private (Admin)
export const getPromotionPreview = asyncHandler(async (req, res) => {
  const { class: className, section } = req.query;

  if (!className) {
    return res.status(400).json({ success: false, error: 'Class is required' });
  }

  const nextClass = getNextClass(className);
  if (!nextClass) {
    return res.status(400).json({
      success: false,
      error: `Class ${className} is the highest class. No promotion possible.`
    });
  }

  // Get active students in this class
  const query = { currentClass: className, status: 'Active' };
  if (section) query.section = section;

  const students = await Student.find(query)
    .select('firstName lastName admissionNo rollNo currentClass section feeStructure')
    .sort({ section: 1, rollNo: 1 })
    .lean();

  if (students.length === 0) {
    return res.status(200).json({
      success: true,
      data: { students: [], nextClass, currentFeeStructure: null, nextFeeStructure: null }
    });
  }

  // Get current and next class fee structures for comparison
  const [currentFeeStructure, nextFeeStructure] = await Promise.all([
    FeeStructure.findOne({ class: className }).lean(),
    FeeStructure.findOne({ class: nextClass }).lean(),
  ]);

  // Build preview for each student
  const preview = students.map(student => {
    const discountType = student.feeStructure?.discountType || 'None';
    const discountPercentage = student.feeStructure?.discountPercentage || 0;

    // Calculate what their new fee will be after promotion
    const nextBaseFee = nextFeeStructure?.tuitionFee || 0;
    const discountAmount = nextBaseFee * discountPercentage / 100;
    const netFeeAfterPromotion = nextBaseFee - discountAmount;

    return {
      _id: student._id,
      name: `${student.firstName} ${student.lastName || ''}`.trim(),
      admissionNo: student.admissionNo,
      rollNo: student.rollNo,
      currentClass: student.currentClass,
      section: student.section,
      nextClass,
      discountType,
      discountPercentage,
      currentBaseFee: currentFeeStructure?.tuitionFee || 0,
      nextBaseFee,
      netFeeAfterPromotion,
    };
  });

  res.status(200).json({
    success: true,
    data: {
      students: preview,
      nextClass,
      totalStudents: preview.length,
      currentFeeStructure,
      nextFeeStructure,
    }
  });
});

// @desc    Promote selected students to next class
// @route   POST /api/v1/students/promotion/promote
// @access  Private (Admin)
export const promoteStudents = asyncHandler(async (req, res) => {
  const { studentIds, fromClass, toClass, academicYear } = req.body;

  if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
    return res.status(400).json({ success: false, error: 'Please provide studentIds array' });
  }
  if (!fromClass || !toClass) {
    return res.status(400).json({ success: false, error: 'fromClass and toClass are required' });
  }

  // Validate the promotion direction is correct
  const expectedNext = getNextClass(fromClass);
  if (expectedNext !== toClass) {
    return res.status(400).json({
      success: false,
      error: `Invalid promotion: ${fromClass} should promote to ${expectedNext}, not ${toClass}`
    });
  }

  const results = { promoted: [], alreadyHighest: [], notFound: [], errors: [] };

  for (const studentId of studentIds) {
    try {
      const student = await Student.findById(studentId);

      if (!student) {
        results.notFound.push(studentId);
        continue;
      }

      const nextClass = getNextClass(student.currentClass);
      if (!nextClass) {
        results.alreadyHighest.push({
          _id: student._id,
          name: `${student.firstName} ${student.lastName || ''}`.trim(),
          currentClass: student.currentClass,
        });
        continue;
      }

      // Record promotion history
      student.promotionHistory.push({
        fromClass: student.currentClass,
        toClass: nextClass,
        date: new Date(),
        promotedBy: req.user._id,
        academicYear: academicYear || new Date().getFullYear().toString(),
      });

      // Update class
      const oldClass = student.currentClass;
      student.currentClass = nextClass;
      student.lastPromotionDate = new Date();

      // Update roll number for new class
      const classCount = await Student.countDocuments({
        currentClass: nextClass,
        section: student.section,
        _id: { $ne: student._id }, // exclude self
      });
      student.rollNo = `${nextClass}-${student.section}-${String(classCount + 1).padStart(2, '0')}`;

      // Discount stays on the student — fee amounts come from FeeStructure at generation time
      // No fee changes needed here

      await student.save();

      results.promoted.push({
        _id: student._id,
        name: `${student.firstName} ${student.lastName || ''}`.trim(),
        admissionNo: student.admissionNo,
        fromClass: oldClass,
        toClass: nextClass,
        newRollNo: student.rollNo,
        discountPreserved: student.feeStructure?.discountPercentage || 0,
      });

    } catch (error) {
      results.errors.push({ studentId, error: error.message });
    }
  }

  res.status(200).json({
    success: true,
    message: `Promotion complete: ${results.promoted.length} promoted, ${results.alreadyHighest.length} already at highest class`,
    data: results,
  });
});

// @desc    Get promotion history for a class or student
// @route   GET /api/v1/students/promotion/history
// @access  Private (Admin)
export const getPromotionHistory = asyncHandler(async (req, res) => {
  const { studentId, class: className } = req.query;

  const query = {};
  if (studentId) query._id = studentId;
  if (className) query.currentClass = className;

  const students = await Student.find(query)
    .select('firstName lastName admissionNo currentClass section promotionHistory')
    .populate('promotionHistory.promotedBy', 'name email')
    .lean();

  const history = students
    .filter(s => s.promotionHistory && s.promotionHistory.length > 0)
    .map(s => ({
      student: {
        _id: s._id,
        name: `${s.firstName} ${s.lastName || ''}`.trim(),
        admissionNo: s.admissionNo,
        currentClass: s.currentClass,
        section: s.section,
      },
      promotions: s.promotionHistory.sort((a, b) => new Date(b.date) - new Date(a.date)),
    }));

  res.status(200).json({
    success: true,
    count: history.length,
    data: history,
  });
});