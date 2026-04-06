import Teacher from '../models/Teacher.js';
import User from '../../users/models/User.js';
import Student from '../../students/models/Student.js';
import Attendance from '../../attendance/models/Attendance.js';
import Holiday from '../../attendance/models/Holiday.js';
import asyncHandler from '../../../middlewares/asyncHandler.js';
import { format, isToday, parseISO, isSunday } from 'date-fns';

// @desc    Get logged-in teacher's profile
// @route   GET /api/v1/teachers/me
// @access  Private (Teacher)
export const getMyProfile = asyncHandler(async (req, res) => {
  const teacher = await Teacher.findOne({ userId: req.user._id })
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email')
    .lean();

  if (!teacher) {
    return res.status(404).json({
      success: false,
      error: 'Teacher profile not found'
    });
  }

  const user = await User.findById(req.user._id).select('-password');
  
  res.status(200).json({
    success: true,
    data: {
      ...teacher,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        assignedClasses: user.assignedClasses || []
      }
    }
  });
});

// @desc    Get logged-in teacher's assigned classes
// @route   GET /api/v1/teachers/me/classes
// @access  Private (Teacher)
export const getMyClasses = asyncHandler(async (req, res) => {
  const teacher = await Teacher.findOne({ userId: req.user._id }).lean();
  
  if (!teacher) {
    return res.status(404).json({
      success: false,
      error: 'Teacher profile not found'
    });
  }

  const user = await User.findById(req.user._id);
  
  if (!user || !user.assignedClasses || user.assignedClasses.length === 0) {
    return res.status(200).json({
      success: true,
      data: [],
      message: 'No classes assigned yet'
    });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const classDetails = await Promise.all(
    user.assignedClasses.map(async (classStr) => {
      const [className, section] = classStr.split('-');
      
      const studentCount = await Student.countDocuments({
        currentClass: className,
        section: section,
        status: 'Active'
      });

      // Get approved attendance for today
      const todayApprovedAttendance = await Attendance.countDocuments({
        class: className,
        section: section,
        date: {
          $gte: today,
          $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        },
        status: 'Present',
        approvalStatus: 'Approved'  // Updated to match new enum
      });

      // Get pending attendance for today marked by this teacher
      const todayPendingAttendance = await Attendance.countDocuments({
        class: className,
        section: section,
        date: {
          $gte: today,
          $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        },
        markedBy: req.user.id,
        approvalStatus: 'Pending'  // Updated to match new enum
      });

      const attendancePercentage = studentCount > 0 
        ? Math.round((todayApprovedAttendance / studentCount) * 100)
        : 0;

      return {
        class: className,
        section: section,
        fullName: `Class ${className}-${section}`,
        studentCount,
        todayApprovedPresent: todayApprovedAttendance,
        todayPendingCount: todayPendingAttendance,
        todayAbsent: studentCount - todayApprovedAttendance,
        attendancePercentage,
        teacherId: teacher._id,
        teacherName: `${teacher.firstName} ${teacher.lastName || ''}`.trim()
      };
    })
  );

  res.status(200).json({
    success: true,
    data: classDetails,
    count: classDetails.length
  });
});

// @desc    Get students for teacher's assigned classes
// @route   GET /api/v1/teachers/me/students
// @access  Private (Teacher)
export const getMyStudents = asyncHandler(async (req, res) => {
  const { class: className, section, search } = req.query;
  
  const user = await User.findById(req.user._id);
  
  if (!user || !user.assignedClasses || user.assignedClasses.length === 0) {
    return res.status(200).json({
      success: true,
      data: [],
      message: 'No classes assigned'
    });
  }

  const query = {
    status: 'Active'
  };

  if (className && section) {
    query.currentClass = className;
    query.section = section;
    
    const classStr = `${className}-${section}`;
    if (!user.assignedClasses.includes(classStr)) {
      return res.status(403).json({
        success: false,
        error: 'You are not assigned to this class'
      });
    }
  } else {
    const classQueries = user.assignedClasses.map(classStr => {
      const [cls, sec] = classStr.split('-');
      return { currentClass: cls, section: sec };
    });
    query.$or = classQueries;
  }

  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { rollNo: { $regex: search, $options: 'i' } },
      { fatherName: { $regex: search, $options: 'i' } }
    ];
  }

  const students = await Student.find(query)
    .select('_id rollNo firstName lastName currentClass section fatherName motherName phone attendanceSummary')
    .sort('currentClass section rollNo')
    .lean();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const studentsWithAttendance = await Promise.all(
    students.map(async (student) => {
      // Get approved attendance
      const todayApprovedAttendance = await Attendance.findOne({
        student: student._id,
        date: {
          $gte: today,
          $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        },
        approvalStatus: 'Approved'  // Updated to match new enum
      }).lean();

      // Get pending attendance marked by this teacher
      const todayPendingAttendance = await Attendance.findOne({
        student: student._id,
        date: {
          $gte: today,
          $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        },
        markedBy: req.user.id,
        approvalStatus: 'Pending'  // Updated to match new enum
      }).lean();

      let todayStatus = 'Not Marked';
      let todayRemarks = '';
      let isPending = false;
      let isTeacherMarked = false;

      if (todayApprovedAttendance) {
        todayStatus = todayApprovedAttendance.status;
        todayRemarks = todayApprovedAttendance.remarks || '';
      } else if (todayPendingAttendance) {
        todayStatus = todayPendingAttendance.status;
        todayRemarks = todayPendingAttendance.remarks || '';
        isPending = true;
        isTeacherMarked = true;
      }

      return {
        ...student,
        fullName: `${student.firstName} ${student.lastName || ''}`.trim(),
        todayStatus,
        todayRemarks,
        isPending,
        isTeacherMarked,
        canEdit: !todayApprovedAttendance && isToday(new Date()) // Can edit if no approved attendance and it's today
      };
    })
  );

  const classStats = {};
  studentsWithAttendance.forEach(student => {
    const classKey = `${student.currentClass}-${student.section}`;
    if (!classStats[classKey]) {
      classStats[classKey] = { total: 0, approvedPresent: 0, pending: 0, notMarked: 0 };
    }
    classStats[classKey].total++;
    if (student.todayStatus === 'Present' && !student.isPending) classStats[classKey].approvedPresent++;
    if (student.isPending) classStats[classKey].pending++;
    if (student.todayStatus === 'Not Marked') classStats[classKey].notMarked++;
  });

  res.status(200).json({
    success: true,
    data: studentsWithAttendance,
    count: studentsWithAttendance.length,
    classStats: Object.entries(classStats).map(([className, stats]) => ({
      className,
      ...stats
    }))
  });
});

// @desc    Get attendance for a specific class on a specific date (TEACHER VIEW)
// @route   GET /api/v1/teachers/me/attendance
// @access  Private (Teacher)
export const getClassAttendance = asyncHandler(async (req, res) => {
  const { date, class: className, section } = req.query;
  
  if (!date || !className || !section) {
    return res.status(400).json({
      success: false,
      error: 'Date, class, and section are required'
    });
  }

  const user = await User.findById(req.user._id);
  const classStr = `${className}-${section}`;
  
  if (!user.assignedClasses.includes(classStr)) {
    return res.status(403).json({
      success: false,
      error: 'You are not assigned to this class'
    });
  }

  const attendanceDate = new Date(date);
  
  // Check if date is in the future (teachers can't see future dates)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  attendanceDate.setHours(0, 0, 0, 0);
  
  if (attendanceDate > today) {
    return res.status(200).json({
      success: true,
      data: {
        date: attendanceDate,
        class: className,
        section: section,
        isFutureDate: true,
        message: 'Future date - Cannot view attendance',
        summary: { total: 0, present: 0, absent: 0, leave: 0, percentage: 0 },
        students: [],
        isMarked: false,
        canMarkAttendance: false
      }
    });
  }
  
  // Check if date is Sunday
  const isSundayDate = isSunday(attendanceDate);
  
  // Check if date is holiday
  const holiday = await Holiday.findOne({
    date: {
      $gte: attendanceDate,
      $lt: new Date(attendanceDate.getTime() + 24 * 60 * 60 * 1000)
    }
  }).lean();
  
  if (isSundayDate || holiday) {
    return res.status(200).json({
      success: true,
      data: {
        date: attendanceDate,
        class: className,
        section: section,
        isSunday: isSundayDate,
        holiday: holiday ? holiday.title : null,
        holidayType: holiday ? holiday.type : null,
        message: isSundayDate ? 'Sunday - No school' : `Holiday: ${holiday.title}`,
        summary: { total: 0, present: 0, absent: 0, leave: 0, percentage: 0 },
        students: [],
        isMarked: false,
        canMarkAttendance: false
      }
    });
  }

  const isTodayDate = attendanceDate.getTime() === today.getTime();
  
  const students = await Student.find({
    currentClass: className,
    section: section,
    status: 'Active'
  })
  .select('_id rollNo firstName lastName fatherName')
  .sort('rollNo')
  .lean();

  // Get all attendance records for this date and class
  const existingAttendance = await Attendance.find({
    date: attendanceDate,
    student: { $in: students.map(s => s._id) }
  })
  .populate('markedBy', 'name')
  .lean();

  // UPDATED SECTION: Updated attendanceData mapping as requested
  const attendanceData = students.map(student => {
    // Check if there's a pending attendance marked by teacher
    const pendingRecord = existingAttendance.find(a => 
      a.student.toString() === student._id.toString() &&
      a.approvalStatus === 'Pending'
    );
    
    // Check if there's approved attendance
    const approvedRecord = existingAttendance.find(a => 
      a.student.toString() === student._id.toString() &&
      a.approvalStatus === 'Approved'
    );

    const attendanceRecord = approvedRecord || pendingRecord || null;
    
    return {
      student: {
        _id: student._id,
        name: `${student.firstName} ${student.lastName || ''}`.trim(),
        rollNo: student.rollNo,
        fatherName: student.fatherName
      },
      status: pendingRecord ? pendingRecord.status : (attendanceRecord?.status || 'Present'),
      remarks: pendingRecord ? pendingRecord.remarks : (attendanceRecord?.remarks || ''),
      markedBy: attendanceRecord?.markedBy || null,
      updatedAt: attendanceRecord?.updatedAt || null,
      _id: attendanceRecord?._id || null,
      approvalStatus: pendingRecord ? 'Pending' : (attendanceRecord?.approvalStatus || 'Not Marked'),
      isTeacherMarked: !!pendingRecord
    };
  });

  // Calculate summary (only approved attendance counts)
  const approvedAttendance = existingAttendance.filter(a => a.approvalStatus === 'Approved');
  const pendingAttendance = existingAttendance.filter(a => a.approvalStatus === 'Pending');
  
  const approvedSummary = approvedAttendance.reduce((acc, curr) => {
    acc[curr.status] = (acc[curr.status] || 0) + 1;
    acc.total = (acc.total || 0) + 1;
    return acc;
  }, {});

  // Pending summary
  const pendingSummary = pendingAttendance.reduce((acc, curr) => {
    acc[curr.status] = (acc[curr.status] || 0) + 1;
    return acc;
  }, {});

  res.status(200).json({
    success: true,
    data: {
      date: attendanceDate,
      class: className,
      section: section,
      isToday: isTodayDate,
      summary: {
        total: students.length,
        approved: {
          present: approvedSummary.Present || 0,
          absent: approvedSummary.Absent || 0,
          leave: approvedSummary.Leave || 0,
          percentage: approvedSummary.total ? ((approvedSummary.Present || 0) / approvedSummary.total * 100).toFixed(1) : 0
        },
        pending: {
          present: pendingSummary.Present || 0,
          absent: pendingSummary.Absent || 0,
          leave: pendingSummary.Leave || 0,
          count: pendingAttendance.length
        }
      },
      students: attendanceData,
      hasApprovedAttendance: approvedAttendance.length > 0,
      hasPendingAttendance: pendingAttendance.length > 0,
      isEditable: isTodayDate && approvedAttendance.length === 0, // Editable if it's today and no approved attendance
      canMarkAttendance: isTodayDate // Add this flag for consistency
    }
  });
});

// @desc    Mark attendance for a class (Teacher - goes to pending)
// @route   POST /api/v1/teachers/me/attendance
// @access  Private (Teacher)
export const markClassAttendance = asyncHandler(async (req, res) => {
  const { date, class: className, section, students: attendanceRecords } = req.body;
  
  if (!date || !className || !section || !attendanceRecords || !Array.isArray(attendanceRecords)) {
    return res.status(400).json({
      success: false,
      error: 'Date, class, section, and students array are required'
    });
  }

  const user = await User.findById(req.user._id);
  const classStr = `${className}-${section}`;
  
  if (!user.assignedClasses.includes(classStr)) {
    return res.status(403).json({
      success: false,
      error: 'You are not assigned to this class'
    });
  }

  const attendanceDate = new Date(date);
  const today = new Date();
  
  // Normalize dates to compare only dates (not times)
  attendanceDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  
  // Teachers can only mark attendance for today
  if (attendanceDate.getTime() !== today.getTime()) {
    return res.status(400).json({
      success: false,
      error: 'Teachers can only mark attendance for today'
    });
  }

  // ========== ADD THIS HOLIDAY CHECK ==========
  // Check if date is Sunday
  const isSundayDate = isSunday(attendanceDate);
  if (isSundayDate) {
    return res.status(400).json({
      success: false,
      error: 'Cannot mark attendance on Sunday'
    });
  }

  // Check if date is holiday
  const holiday = await Holiday.isHoliday(attendanceDate); // CHANGED: Using isHoliday() method
  if (holiday) {
    return res.status(400).json({
      success: false,
      error: `Cannot mark attendance on holiday: ${holiday.title}`
    });
  }
  // ========== END HOLIDAY CHECK ==========

  // ... REST OF THE EXISTING FUNCTION STAYS THE SAME ...
  // The rest of the function (lines 210-281) remains unchanged

  const results = {
    created: 0,
    updated: 0,  // Added updated count
    failed: 0,
    errors: []
  };

  for (const record of attendanceRecords) {
    try {
      const { studentId, status = 'Present', remarks } = record;
      
      const student = await Student.findOne({
        _id: studentId,
        currentClass: className,
        section: section,
        status: 'Active'
      });
      
      if (!student) {
        results.failed++;
        results.errors.push(`Student not found or not in this class: ${studentId}`);
        continue;
      }

      // Check if there's already an attendance record for this student on this date
      const existingAttendance = await Attendance.findOne({
        date: attendanceDate,
        student: studentId,
        class: className,
        section: section
      });

      if (existingAttendance) {
        // Check if approved - teachers cannot modify approved attendance
        if (existingAttendance.approvalStatus === 'Approved') {
          return res.status(400).json({
            success: false,
            error: 'Cannot modify approved attendance. Contact admin.'
          });
        }
        
        // Update existing attendance
        existingAttendance.status = status;
        existingAttendance.remarks = remarks || '';
        existingAttendance.markedBy = req.user.id;
        existingAttendance.approvalStatus = 'Pending';
        existingAttendance.isTeacherMarked = true;
        existingAttendance.updatedAt = new Date();
        await existingAttendance.save();
        results.updated++;
      } else {
        // Create new attendance with teacher marking
        await Attendance.create({
          date: attendanceDate,
          student: studentId,
          studentName: `${student.firstName} ${student.lastName || ''}`.trim(),
          rollNo: student.rollNo,
          class: className,
          section: section,
          status: status,
          remarks: remarks || '',
          markedBy: req.user.id,
          approvalStatus: 'Pending',
          isTeacherMarked: true,
          updatedAt: new Date()
        });
        results.created++;
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`Error for student ${record.studentId}: ${error.message}`);
    }
  }

  res.status(200).json({
    success: true,
    data: results,
    message: `Attendance processed successfully. ${results.created} created, ${results.updated} updated - now pending admin approval.`
  });
});

// @desc    Update teacher's pending attendance (for today only)
// @route   PUT /api/v1/teachers/me/attendance/update
// @access  Private (Teacher)
export const updateClassAttendance = asyncHandler(async (req, res) => {
  const { date, class: className, section, students: attendanceRecords } = req.body;
  
  if (!date || !className || !section || !attendanceRecords || !Array.isArray(attendanceRecords)) {
    return res.status(400).json({
      success: false,
      error: 'Date, class, section, and students array are required'
    });
  }

  const user = await User.findById(req.user._id);
  const classStr = `${className}-${section}`;
  
  if (!user.assignedClasses.includes(classStr)) {
    return res.status(403).json({
      success: false,
      error: 'You are not assigned to this class'
    });
  }

  const attendanceDate = new Date(date);
  const today = new Date();
  
  // Normalize dates to compare only dates (not times)
  attendanceDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  
  // Teachers can only update today's attendance
  if (attendanceDate.getTime() !== today.getTime()) {
    return res.status(400).json({
      success: false,
      error: 'Teachers can only update attendance for today'
    });
  }

  // ========== ADD HOLIDAY CHECK HERE ==========
  // Check if date is Sunday
  const isSundayDate = isSunday(attendanceDate);
  if (isSundayDate) {
    return res.status(400).json({
      success: false,
      error: 'Cannot update attendance on Sunday'
    });
  }

  // Check if date is holiday
  const holiday = await Holiday.findOne({
    date: {
      $gte: attendanceDate,
      $lt: new Date(attendanceDate.getTime() + 24 * 60 * 60 * 1000)
    }
  });
  
  if (holiday) {
    return res.status(400).json({
      success: false,
      error: `Cannot update attendance on holiday: ${holiday.title}`
    });
  }
  // ========== END HOLIDAY CHECK ==========

  const results = {
    updated: 0,
    failed: 0,
    errors: []
  };

  for (const record of attendanceRecords) {
    try {
      const { studentId, status, remarks } = record;
      
      // Find existing pending attendance marked by this teacher
      const existingAttendance = await Attendance.findOne({
        date: attendanceDate,
        student: studentId,
        class: className,
        section: section,
        markedBy: req.user.id,
        approvalStatus: 'Pending'  // Updated to match new enum
      });

      if (!existingAttendance) {
        results.failed++;
        results.errors.push(`No pending attendance found for student: ${studentId}`);
        continue;
      }

      // Update pending attendance
      existingAttendance.status = status;
      existingAttendance.remarks = remarks || '';
      existingAttendance.isTeacherMarked = true;  // Ensure this is set
      existingAttendance.updatedAt = new Date();
      await existingAttendance.save();
      results.updated++;

    } catch (error) {
      results.failed++;
      results.errors.push(`Error for student ${record.studentId}: ${error.message}`);
    }
  }

  res.status(200).json({
    success: true,
    data: results,
    message: `Attendance updated successfully. ${results.updated} records updated. Still pending admin approval.`
  });
});

// @desc    Get teacher dashboard statistics
// @route   GET /api/v1/teachers/me/stats
// @access  Private (Teacher)
export const getDashboardStats = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  
  if (!user || !user.assignedClasses || user.assignedClasses.length === 0) {
    return res.status(200).json({
      success: true,
      data: {
        totalClasses: 0,
        totalStudents: 0,
        todayAttendance: 0,
        pendingTasks: 0,
        pendingApproval: 0,
        classStats: []
      }
    });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let totalStudents = 0;
  let totalPendingApproval = 0;
  
  const classStats = await Promise.all(
    user.assignedClasses.map(async (classStr) => {
      const [className, section] = classStr.split('-');
      
      const studentCount = await Student.countDocuments({
        currentClass: className,
        section: section,
        status: 'Active'
      });
      
      totalStudents += studentCount;

      // Get approved attendance for today
      const todayApprovedAttendance = await Attendance.countDocuments({
        class: className,
        section: section,
        date: {
          $gte: today,
          $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        },
        status: 'Present',
        approvalStatus: 'Approved'  // Updated to match new enum
      });

      // Get pending attendance for today
      const todayPendingAttendance = await Attendance.countDocuments({
        class: className,
        section: section,
        date: {
          $gte: today,
          $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        },
        markedBy: req.user.id,
        approvalStatus: 'Pending'  // Updated to match new enum
      });

      totalPendingApproval += todayPendingAttendance;

      const attendancePercentage = studentCount > 0 
        ? Math.round((todayApprovedAttendance / studentCount) * 100)
        : 0;

      return {
        className,
        section,
        studentCount,
        todayApprovedPresent: todayApprovedAttendance,
        todayPendingCount: todayPendingAttendance,
        todayAbsent: studentCount - todayApprovedAttendance,
        attendancePercentage
      };
    })
  );

  const todayTotalApprovedAttendance = classStats.reduce((sum, cls) => sum + cls.todayApprovedPresent, 0);
  const todayAttendancePercentage = totalStudents > 0 
    ? Math.round((todayTotalApprovedAttendance / totalStudents) * 100)
    : 0;

  res.status(200).json({
    success: true,
    data: {
      totalClasses: user.assignedClasses.length,
      totalStudents,
      todayAttendance: todayAttendancePercentage,
      pendingTasks: totalPendingApproval,
      pendingApproval: totalPendingApproval,
      classStats
    }
  });
});

// @desc    Check if attendance already marked for today
// @route   GET /api/v1/teachers/me/attendance/check
// @access  Private (Teacher)
export const checkTodayAttendance = asyncHandler(async (req, res) => {
  const { date, class: className, section } = req.query;
  
  if (!date || !className || !section) {
    return res.status(400).json({
      success: false,
      error: 'Date, class, and section are required'
    });
  }

  const user = await User.findById(req.user._id);
  const classStr = `${className}-${section}`;
  
  if (!user.assignedClasses.includes(classStr)) {
    return res.status(403).json({
      success: false,
      error: 'You are not assigned to this class'
    });
  }

  const attendanceDate = new Date(date);
  attendanceDate.setHours(0, 0, 0, 0);
  const nextDay = new Date(attendanceDate);
  nextDay.setDate(nextDay.getDate() + 1);
  
  // Check if date is Sunday
  const isSundayDate = isSunday(attendanceDate);
  
  // Check if date is holiday
  const holiday = await Holiday.findOne({
    date: {
      $gte: attendanceDate,
      $lt: nextDay
    }
  });

  if (isSundayDate || holiday) {
    return res.status(200).json({
      success: true,
      data: {
        date: attendanceDate,
        class: className,
        section: section,
        isSunday: isSundayDate,
        holiday: holiday ? holiday.title : null,
        holidayType: holiday ? holiday.type : null,
        message: isSundayDate ? 'Sunday - No school' : `Holiday: ${holiday.title}`,
        approvedCount: 0,
        pendingCount: 0,
        totalStudents: 0,
        approvedPercentage: 0,
        isFullyApproved: false,
        hasPending: false,
        isToday: false,
        canMark: false,
        canUpdate: false,
        isHoliday: true
      }
    });
  }

  // Count approved attendance
  const approvedCount = await Attendance.countDocuments({
    class: className,
    section: section,
    date: {
      $gte: attendanceDate,
      $lt: nextDay
    },
    approvalStatus: 'Approved'  // Updated to match new enum
  });

  // Count pending attendance marked by this teacher
  const pendingCount = await Attendance.countDocuments({
    class: className,
    section: section,
    date: {
      $gte: attendanceDate,
      $lt: nextDay
    },
    markedBy: req.user.id,
    approvalStatus: 'Pending'  // Updated to match new enum
  });

  // Get total students
  const totalStudents = await Student.countDocuments({
    currentClass: className,
    section: section,
    status: 'Active'
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isTodayDate = attendanceDate.getTime() === today.getTime();

  res.status(200).json({
    success: true,
    data: {
      date: attendanceDate,
      class: className,
      section: section,
      approvedCount,
      pendingCount,
      totalStudents,
      approvedPercentage: totalStudents > 0 ? Math.round((approvedCount / totalStudents) * 100) : 0,
      isFullyApproved: approvedCount >= totalStudents,
      hasPending: pendingCount > 0,
      isToday: isTodayDate,
      canMark: isTodayDate && approvedCount === 0 && pendingCount === 0 && !isSundayDate && !holiday,
      canUpdate: isTodayDate && approvedCount === 0 && pendingCount > 0 && !isSundayDate && !holiday,
      isHoliday: !!holiday
    }
  });
});

// @desc    Get attendance report for printing (only approved attendance)
// @route   GET /api/v1/teachers/me/attendance/report
// @access  Private (Teacher)
export const getAttendanceReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, class: className, section } = req.query;
  
  if (!startDate || !endDate || !className || !section) {
    return res.status(400).json({
      success: false,
      error: 'Start date, end date, class, and section are required'
    });
  }

  const user = await User.findById(req.user._id);
  const classStr = `${className}-${section}`;
  
  if (!user.assignedClasses.includes(classStr)) {
    return res.status(403).json({
      success: false,
      error: 'You are not assigned to this class'
    });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  // Get all students in the class
  const students = await Student.find({
    currentClass: className,
    section: section,
    status: 'Active'
  })
  .select('_id firstName lastName rollNo')
  .sort('rollNo')
  .lean();

  // Get all APPROVED attendance records for the period
  const attendanceRecords = await Attendance.find({
    class: className,
    section: section,
    date: {
      $gte: start,
      $lte: end
    },
    student: { $in: students.map(s => s._id) },
    approvalStatus: 'Approved' // Updated to match new enum
  })
  .sort('date')
  .lean();

  // Get holidays in the period
  const holidays = await Holiday.find({
    date: {
      $gte: start,
      $lte: end
    }
  }).lean();

  // Create report data
  const report = students.map(student => {
    const studentAttendance = attendanceRecords.filter(record => 
      record.student.toString() === student._id.toString()
    );
    
    const totalDays = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
    const presentDays = studentAttendance.filter(a => a.status === 'Present').length;
    const absentDays = studentAttendance.filter(a => a.status === 'Absent').length;
    const leaveDays = studentAttendance.filter(a => a.status === 'Leave').length;
    
    // Calculate attendance percentage (excluding leave days)
    const effectiveDays = totalDays - leaveDays;
    const attendancePercentage = effectiveDays > 0 
      ? Math.round((presentDays / effectiveDays) * 100)
      : 100;

    return {
      studentId: student._id,
      rollNo: student.rollNo,
      name: `${student.firstName} ${student.lastName || ''}`.trim(),
      totalDays,
      presentDays,
      absentDays,
      leaveDays,
      attendancePercentage,
      attendanceRecords: studentAttendance.map(record => ({
        date: record.date,
        status: record.status,
        remarks: record.remarks
      }))
    };
  });

  // Calculate class summary
  const classSummary = {
    totalStudents: students.length,
    totalDays: Math.floor((end - start) / (1000 * 60 * 60 * 1000 * 24)) + 1,
    totalPresent: report.reduce((sum, student) => sum + student.presentDays, 0),
    totalAbsent: report.reduce((sum, student) => sum + student.absentDays, 0),
    totalLeave: report.reduce((sum, student) => sum + student.leaveDays, 0),
    averageAttendance: Math.round(
      report.reduce((sum, student) => sum + student.attendancePercentage, 0) / students.length
    )
  };

  res.status(200).json({
    success: true,
    data: {
      reportPeriod: {
        startDate: start,
        endDate: end,
        className,
        section
      },
      classSummary,
      holidays,
      studentReports: report
    }
  });
});