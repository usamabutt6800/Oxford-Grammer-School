import Exam from '../models/Exam.js';
import ExamResult from '../models/ExamResult.js';
import Student from '../../students/models/Student.js';
import FeeStructure from '../../fees/models/FeeStructure.js';
import asyncHandler from '../../../middlewares/asyncHandler.js';

// Helper function to calculate grade
function getGrade(percentage) {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C+';
  if (percentage >= 40) return 'C';
  if (percentage >= 33) return 'D';
  return 'F';
}

// @desc    Create new exam
// @route   POST /api/v1/exams
// @access  Private (Admin)
export const createExam = asyncHandler(async (req, res) => {
  const { name, academicYear, class: className, subjects, startDate, endDate } = req.body;

  // Check if exam already exists for this class and term
  const existingExam = await Exam.findOne({
    name,
    academicYear,
    class: className
  });

  if (existingExam) {
    return res.status(400).json({
      success: false,
      error: `Exam already exists for Class ${className} - ${name} ${academicYear}`
    });
  }

  // Calculate total marks
  const totalMarks = subjects.reduce((sum, subject) => sum + subject.totalMarks, 0);

  const exam = await Exam.create({
    name,
    academicYear,
    class: className,
    subjects,
    startDate,
    endDate,
    totalMarks,
    createdBy: req.user.id
  });

  res.status(201).json({
    success: true,
    data: exam
  });
});

// @desc    Get all exams
// @route   GET /api/v1/exams
// @access  Private (Admin/Teacher)
export const getExams = asyncHandler(async (req, res) => {
  const { academicYear, class: className, status, name, page = 1, limit = 10 } = req.query;

  const query = {};
  if (academicYear) query.academicYear = academicYear;
  if (className) query.class = className;
  if (status) query.status = status;
  if (name) query.name = name;

  const exams = await Exam.find(query)
    .populate('createdBy', 'name email')
    .sort({ academicYear: -1, class: 1, startDate: 1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .lean();

  const total = await Exam.countDocuments(query);

  res.status(200).json({
    success: true,
    data: exams,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: parseInt(page)
  });
});

// @desc    Get single exam
// @route   GET /api/v1/exams/:id
// @access  Private (Admin/Teacher)
export const getExam = asyncHandler(async (req, res) => {
  const exam = await Exam.findById(req.params.id)
    .populate('createdBy', 'name email');

  if (!exam) {
    return res.status(404).json({
      success: false,
      error: 'Exam not found'
    });
  }

  res.status(200).json({
    success: true,
    data: exam
  });
});

// @desc    Update exam
// @route   PUT /api/v1/exams/:id
// @access  Private (Admin)
export const updateExam = asyncHandler(async (req, res) => {
  const exam = await Exam.findById(req.params.id);

  if (!exam) {
    return res.status(404).json({
      success: false,
      error: 'Exam not found'
    });
  }

  const updatedExam = await Exam.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    data: updatedExam
  });
});

// @desc    Delete exam
// @route   DELETE /api/v1/exams/:id
// @access  Private (Admin)
export const deleteExam = asyncHandler(async (req, res) => {
  const exam = await Exam.findById(req.params.id);

  if (!exam) {
    return res.status(404).json({
      success: false,
      error: 'Exam not found'
    });
  }

  // Check if results exist for this exam
  const resultsCount = await ExamResult.countDocuments({ exam: exam._id });
  if (resultsCount > 0) {
    return res.status(400).json({
      success: false,
      error: 'Cannot delete exam with existing results'
    });
  }

  await exam.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Submit exam results
// @route   POST /api/v1/exams/:id/results
// @access  Private (Admin)
export const submitExamResults = asyncHandler(async (req, res) => {
  const { results } = req.body;
  const examId = req.params.id;

  const exam = await Exam.findById(examId);
  if (!exam) {
    return res.status(404).json({
      success: false,
      error: 'Exam not found'
    });
  }

  // Process each student's result
  const processedResults = [];
  const errors = [];

  for (const result of results) {
    try {
      const student = await Student.findById(result.studentId);
      if (!student) {
        errors.push(`Student not found: ${result.studentId}`);
        continue;
      }

      // Calculate totals and percentage
      const totalMarksObtained = result.subjectResults.reduce((sum, subj) => sum + subj.marksObtained, 0);
      const totalMarks = result.subjectResults.reduce((sum, subj) => sum + subj.totalMarks, 0);
      const percentage = (totalMarksObtained / totalMarks) * 100;

      // Determine grade
      const grade = getGrade(percentage);

      // Determine result (pass/fail)
      const pass = percentage >= exam.passPercentage;

      // Create or update exam result
      const examResult = await ExamResult.findOneAndUpdate(
        { student: result.studentId, exam: examId },
        {
          student: result.studentId,
          exam: examId,
          class: student.currentClass,
          section: student.section,
          subjectResults: result.subjectResults,
          totalMarksObtained,
          totalMarks,
          percentage,
          grade,
          result: pass ? 'Pass' : 'Fail',
          remarks: result.remarks,
          createdBy: req.user.id
        },
        { upsert: true, new: true, runValidators: true }
      );

      // Update student's exam results array
      const studentExamResult = {
        examType: exam.name,
        year: exam.academicYear.split('-')[0],
        subjects: result.subjectResults.map(subj => ({
          subjectName: subj.subjectName,
          marks: subj.marksObtained,
          totalMarks: subj.totalMarks,
          grade: getGrade(subj.marksObtained / subj.totalMarks * 100)
        })),
        totalMarks: totalMarks,
        obtainedMarks: totalMarksObtained,
        percentage: percentage,
        result: pass ? 'Pass' : 'Fail',
        remarks: result.remarks
      };

      // Remove existing result if exists
      await Student.findByIdAndUpdate(result.studentId, {
        $pull: { 
          examResults: { 
            examType: exam.name,
            year: exam.academicYear.split('-')[0]
          } 
        }
      });

      // Add new result
      await Student.findByIdAndUpdate(result.studentId, {
        $push: { examResults: studentExamResult }
      });

      processedResults.push(examResult);
    } catch (error) {
      errors.push(`Error processing student ${result.studentId}: ${error.message}`);
    }
  }

  // Update exam status to completed if all results processed
  if (errors.length === 0) {
    exam.status = 'Completed';
    await exam.save();
  }

  res.status(200).json({
    success: true,
    data: {
      processed: processedResults.length,
      errors: errors.length > 0 ? errors : undefined,
      results: processedResults
    }
  });
});

// @desc    Get exam results
// @route   GET /api/v1/exams/:id/results
// @access  Private (Admin/Teacher)
export const getExamResults = asyncHandler(async (req, res) => {
  const examId = req.params.id;
  const { class: className, section } = req.query;

  const exam = await Exam.findById(examId);
  if (!exam) {
    return res.status(404).json({
      success: false,
      error: 'Exam not found'
    });
  }

  const query = { exam: examId };
  if (className) query.class = className;
  if (section) query.section = section;

  const results = await ExamResult.find(query)
    .populate('student', 'firstName lastName admissionNo rollNo fatherName')
    .populate('exam', 'name academicYear passPercentage')
    .populate('createdBy', 'name email')
    .sort({ percentage: -1 })
    .lean();

  // Calculate ranks
  results.forEach((result, index) => {
    result.rank = index + 1;
  });

  res.status(200).json({
    success: true,
    data: {
      exam,
      results
    }
  });
});

// @desc    Promote students after final exam
// @route   POST /api/v1/exams/:id/promote
// @access  Private (Admin)
export const promoteStudentsAfterExam = asyncHandler(async (req, res) => {
  const examId = req.params.id;
  
  const exam = await Exam.findById(examId);
  if (!exam) {
    return res.status(404).json({
      success: false,
      error: 'Exam not found'
    });
  }

  // Only promote after Final exam
  if (exam.name !== 'Final') {
    return res.status(400).json({
      success: false,
      error: 'Promotion only allowed after Final exam'
    });
  }

  // Get all students who passed this exam
  const passingResults = await ExamResult.find({
    exam: examId,
    result: 'Pass'
  }).populate('student');

  const classOrder = ['Play Group', 'Nursery', 'Prep', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
  
  const promotionResults = {
    promoted: [],
    alreadyHighest: [],
    failed: []
  };

  for (const result of passingResults) {
    const student = result.student;
    const currentIndex = classOrder.indexOf(student.currentClass);
    
    if (currentIndex < classOrder.length - 1) {
      // Can promote
      const oldClass = student.currentClass;
      student.currentClass = classOrder[currentIndex + 1];
      
      // Update roll number
      const classNum = student.currentClass.replace(/\D/g, '') || student.currentClass;
      student.rollNo = `${classNum}-${student.section}-${student.admissionNo.slice(-2)}`;
      
      // Update fee structure for new class
      const newClassFee = await FeeStructure.findOne({ class: student.currentClass });
      if (newClassFee) {
        student.feeStructure.tuitionFee = newClassFee.tuitionFee;
        student.feeStructure.netFee = student.feeStructure.netFee - student.feeStructure.tuitionFee + newClassFee.tuitionFee;
      }
      
      // Add to promotion history
      student.promotionHistory.push({
        fromClass: oldClass,
        toClass: student.currentClass,
        date: new Date(),
        promotedBy: req.user.id
      });
      
      student.lastPromotionDate = new Date();
      await student.save();
      
      promotionResults.promoted.push({
        studentId: student._id,
        name: `${student.firstName} ${student.lastName}`,
        from: oldClass,
        to: student.currentClass,
        admissionNo: student.admissionNo
      });
    } else {
      // Already in highest class
      promotionResults.alreadyHighest.push({
        studentId: student._id,
        name: `${student.firstName} ${student.lastName}`,
        currentClass: student.currentClass,
        admissionNo: student.admissionNo
      });
    }
  }

  // Get failed students
  const failedResults = await ExamResult.find({
    exam: examId,
    result: 'Fail'
  }).populate('student');

  failedResults.forEach(result => {
    promotionResults.failed.push({
      studentId: result.student._id,
      name: `${result.student.firstName} ${result.student.lastName}`,
      percentage: result.percentage,
      admissionNo: result.student.admissionNo
    });
  });

  res.status(200).json({
    success: true,
    data: promotionResults,
    message: `Promotion completed. Promoted: ${promotionResults.promoted.length}, Already in highest class: ${promotionResults.alreadyHighest.length}, Failed: ${promotionResults.failed.length}`
  });
});

// @desc    Get exam statistics
// @route   GET /api/v1/exams/:id/stats
// @access  Private (Admin)
export const getExamStats = asyncHandler(async (req, res) => {
  const examId = req.params.id;

  const results = await ExamResult.find({ exam: examId });

  if (results.length === 0) {
    return res.status(200).json({
      success: true,
      data: {
        totalStudents: 0,
        passed: 0,
        failed: 0,
        averagePercentage: 0,
        highestPercentage: 0,
        lowestPercentage: 0,
        gradeDistribution: {
          'A+': 0, 'A': 0, 'B+': 0, 'B': 0, 'C+': 0, 'C': 0, 'D': 0, 'F': 0
        }
      }
    });
  }

  const stats = {
    totalStudents: results.length,
    passed: results.filter(r => r.result === 'Pass').length,
    failed: results.filter(r => r.result === 'Fail').length,
    averagePercentage: results.reduce((sum, r) => sum + r.percentage, 0) / results.length || 0,
    highestPercentage: Math.max(...results.map(r => r.percentage), 0),
    lowestPercentage: Math.min(...results.map(r => r.percentage), 100),
    gradeDistribution: {
      'A+': results.filter(r => r.grade === 'A+').length,
      'A': results.filter(r => r.grade === 'A').length,
      'B+': results.filter(r => r.grade === 'B+').length,
      'B': results.filter(r => r.grade === 'B').length,
      'C+': results.filter(r => r.grade === 'C+').length,
      'C': results.filter(r => r.grade === 'C').length,
      'D': results.filter(r => r.grade === 'D').length,
      'F': results.filter(r => r.grade === 'F').length
    }
  };

  res.status(200).json({
    success: true,
    data: stats
  });
});

// @desc    Get students for exam result entry
// @route   GET /api/v1/exams/:id/students
// @access  Private (Admin)
export const getStudentsForExam = asyncHandler(async (req, res) => {
  const examId = req.params.id;
  const { class: className, section } = req.query;

  const exam = await Exam.findById(examId);
  if (!exam) {
    return res.status(404).json({
      success: false,
      error: 'Exam not found'
    });
  }

  const query = { 
    currentClass: exam.class,
    status: 'Active'
  };
  
  if (section) query.section = section;

  const students = await Student.find(query)
    .select('firstName lastName admissionNo rollNo section')
    .sort({ rollNo: 1 })
    .lean();

  // Get existing results if any
  const existingResults = await ExamResult.find({ 
    exam: examId,
    student: { $in: students.map(s => s._id) }
  }).lean();

  // Map existing results to students
  const studentsWithResults = students.map(student => {
    const existingResult = existingResults.find(r => r.student.toString() === student._id.toString());
    return {
      ...student,
      existingResult: existingResult ? {
        subjectResults: existingResult.subjectResults,
        totalMarksObtained: existingResult.totalMarksObtained,
        percentage: existingResult.percentage,
        grade: existingResult.grade,
        result: existingResult.result
      } : null
    };
  });

  res.status(200).json({
    success: true,
    data: {
      exam,
      students: studentsWithResults
    }
  });
});