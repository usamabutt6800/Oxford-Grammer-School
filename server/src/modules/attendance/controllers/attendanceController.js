import Attendance from '../models/Attendance.js';
import Student from '../../students/models/Student.js';
import Holiday from '../models/Holiday.js';
import asyncHandler from '../../../middlewares/asyncHandler.js';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSunday, parseISO } from 'date-fns';

// @desc    Get attendance by date and class (with approval status)
// @route   GET /api/v1/attendance
// @access  Private (Admin/Teacher)
export const getAttendance = asyncHandler(async (req, res) => {
  const { date, class: className, section } = req.query;
  
  if (!date || !className || !section) {
    return res.status(400).json({
      success: false,
      error: 'Date, class, and section are required'
    });
  }

  const attendanceDate = new Date(date);
  
  // Check if date is Sunday or holiday
  const isSundayDate = isSunday(attendanceDate);
  const holiday = await Holiday.isHoliday(attendanceDate);
  
  if (isSundayDate || holiday) {
    return res.status(200).json({
      success: true,
      data: {
        date: attendanceDate,
        isSunday: isSundayDate,
        holiday: holiday,
        message: isSundayDate ? 'Sunday - No school' : `Holiday: ${holiday.title}`,
        students: [],
        pendingAttendance: []
      }
    });
  }

  // Get all students for the class-section
  const students = await Student.find({
    currentClass: className,
    section: section,
    status: 'Active'
  })
  .select('_id firstName lastName rollNo admissionNo fatherName')
  .sort('rollNo')
  .lean();

  // Get approved attendance records
  const approvedAttendance = await Attendance.find({
    date: attendanceDate,
    class: className,
    section: section,
    approvalStatus: 'Approved'  // Note: capital 'A' to match enum
  })
  .populate('markedBy', 'name')
  .lean();
  
  // Get pending attendance records
  const pendingAttendance = await Attendance.find({
    date: attendanceDate,
    class: className,
    section: section,
    approvalStatus: 'Pending'  // Note: capital 'P' to match enum
  })
  .populate('markedBy', 'name')
  .lean();

  // Merge student data with approved attendance records
  const attendanceData = students.map(student => {
    const attendanceRecord = approvedAttendance.find(a => a.student.toString() === student._id.toString());
    
    return {
      student: {
        _id: student._id,
        name: `${student.firstName} ${student.lastName || ''}`.trim(),
        rollNo: student.rollNo,
        admissionNo: student.admissionNo,
        fatherName: student.fatherName
      },
      status: attendanceRecord?.status || 'Absent',
      remarks: attendanceRecord?.remarks || '',
      markedBy: attendanceRecord?.markedBy || null,
      approvalStatus: attendanceRecord?.approvalStatus || 'Not Marked',
      updatedAt: attendanceRecord?.updatedAt || null,
      _id: attendanceRecord?._id || null
    };
  });

  // Format pending attendance for display
  const formattedPendingAttendance = pendingAttendance.map(record => {
    const student = students.find(s => s._id.toString() === record.student.toString());
    return {
      _id: record._id,
      student: {
        _id: student?._id,
        name: student ? `${student.firstName} ${student.lastName || ''}`.trim() : 'Unknown',
        rollNo: student?.rollNo
      },
      status: record.status,
      remarks: record.remarks,
      markedBy: record.markedBy,
      markedAt: record.updatedAt
    };
  });

  // Get attendance summary (only approved)
  const summary = attendanceData.reduce((acc, curr) => {
    if (curr.approvalStatus === 'Approved') {
      acc[curr.status] = (acc[curr.status] || 0) + 1;
      acc.total = (acc.total || 0) + 1;
    }
    return acc;
  }, {});

  res.status(200).json({
    success: true,
    data: {
      date: attendanceDate,
      class: className,
      section: section,
      isSunday: false,
      holiday: null,
      summary: {
        total: summary.total || 0,
        present: summary.Present || 0,
        absent: summary.Absent || 0,
        leave: summary.Leave || 0,
        percentage: summary.total ? ((summary.Present || 0) / summary.total * 100).toFixed(1) : 0
      },
      students: attendanceData,
      pendingAttendance: formattedPendingAttendance,
      pendingCount: pendingAttendance.length,
      approvedCount: approvedAttendance.length
    }
  });
});

// @desc    Mark/Update attendance (for ADMIN only - auto approves)
// @route   POST /api/v1/attendance
// @access  Private (Admin)

export const markAttendance = asyncHandler(async (req, res) => {
  const { date, students: attendanceRecords } = req.body;
  
  if (!date || !attendanceRecords || !Array.isArray(attendanceRecords)) {
    return res.status(400).json({
      success: false,
      error: 'Date and students array are required'
    });
  }

  const attendanceDate = new Date(date);
  attendanceDate.setHours(0, 0, 0, 0);
  
  // Check if date is Sunday or holiday
  const isSundayDate = isSunday(attendanceDate);
  const holiday = await Holiday.isHoliday(attendanceDate);
  
  if (isSundayDate || holiday) {
    return res.status(400).json({
      success: false,
      error: isSundayDate ? 'Cannot mark attendance on Sunday' : `Cannot mark attendance on holiday: ${holiday.title}`
    });
  }

  const results = {
    created: 0,
    updated: 0,
    failed: 0,
    errors: []
  };

  // Process each attendance record
  for (const record of attendanceRecords) {
    try {
      const { studentId, status, remarks } = record;
      
      // Validate student exists
      const student = await Student.findById(studentId);
      if (!student) {
        results.failed++;
        results.errors.push(`Student not found: ${studentId}`);
        continue;
      }

      // Create exact date range for this day
      const startOfDay = new Date(attendanceDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(attendanceDate);
      endOfDay.setDate(endOfDay.getDate() + 1);
      endOfDay.setHours(0, 0, 0, 0);

      // Find existing attendance for this student on this exact date
      const existingAttendance = await Attendance.findOne({
        date: {
          $gte: startOfDay,
          $lt: endOfDay
        },
        student: studentId
      });

      if (existingAttendance) {
        // Use findOneAndUpdate to bypass Mongoose schema validation
        await Attendance.findOneAndUpdate(
          { _id: existingAttendance._id },
          {
            $set: {
              status: status,
              remarks: remarks || '',
              markedBy: req.user.id,
              approvalStatus: 'Approved',
              approvedBy: req.user.id,
              approvedAt: new Date(),
              updatedAt: new Date(),
              // ADD THESE FIELDS - they will be saved even if not in schema
              studentName: `${student.firstName} ${student.lastName || ''}`.trim(),
              rollNo: student.rollNo,
              class: student.currentClass,
              section: student.section
            }
          },
          { new: true }
        );
        results.updated++;
      } else {
        // Create using direct create with all fields
        const attendanceData = {
          date: attendanceDate,
          student: studentId,
          studentName: `${student.firstName} ${student.lastName || ''}`.trim(),
          rollNo: student.rollNo,
          class: student.currentClass,
          section: student.section,
          status,
          remarks: remarks || '',
          markedBy: req.user.id,
          approvalStatus: 'Approved',
          approvedBy: req.user.id,
          approvedAt: new Date(),
          updatedAt: new Date()
        };
        
        // Use native MongoDB insert if needed
        await Attendance.create(attendanceData);
        results.created++;
      }

      // Update student's attendance summary
      await updateStudentAttendanceSummary(studentId);

    } catch (error) {
      results.failed++;
      results.errors.push(`Error for student ${record.studentId}: ${error.message}`);
      console.error('Error marking attendance:', error);
    }
  }

  res.status(200).json({
    success: true,
    data: results,
    message: `Attendance marked and approved: ${results.created} created, ${results.updated} updated, ${results.failed} failed`
  });
});
// @desc    Mark attendance (for TEACHER - goes to pending)
// @route   POST /api/v1/attendance/teacher
// @access  Private (Teacher)
// @desc    Mark attendance (for TEACHER - goes to pending)
// @route   POST /api/v1/attendance/teacher
// @access  Private (Teacher)
// @desc    Mark attendance (for TEACHER - goes to pending)
// @route   POST /api/v1/attendance/teacher
// @access  Private (Teacher)
export const markAttendanceTeacher = asyncHandler(async (req, res) => {
  const { date, students: attendanceRecords } = req.body;
  
  if (!date || !attendanceRecords || !Array.isArray(attendanceRecords)) {
    return res.status(400).json({
      success: false,
      error: 'Date and students array are required'
    });
  }

  const attendanceDate = new Date(date);
  
  // Check if date is Sunday or holiday
  const isSundayDate = isSunday(attendanceDate);
  const holiday = await Holiday.isHoliday(attendanceDate);
  
  if (isSundayDate || holiday) {
    return res.status(400).json({
      success: false,
      error: isSundayDate ? 'Cannot mark attendance on Sunday' : `Cannot mark attendance on holiday: ${holiday.title}`
    });
  }

  const results = {
    created: 0,
    updated: 0,
    failed: 0,
    errors: []
  };

  // Process each attendance record
  for (const record of attendanceRecords) {
    try {
      const { studentId, status, remarks } = record;
      
      // Validate student exists
      const student = await Student.findById(studentId);
      if (!student) {
        results.failed++;
        results.errors.push(`Student not found: ${studentId}`);
        continue;
      }

      // Prepare student details
      const studentDetails = {
        studentName: `${student.firstName} ${student.lastName || ''}`.trim(),
        rollNo: student.rollNo,
        class: student.currentClass,
        section: student.section
      };

      // Check if approved attendance already exists
      const existingApprovedAttendance = await Attendance.findOne({
        date: attendanceDate,
        student: studentId,
        approvalStatus: 'Approved'
      });

      if (existingApprovedAttendance) {
        results.failed++;
        results.errors.push(`Attendance already approved for student: ${studentId}. Contact admin to update.`);
        continue;
      }

      // Check if pending attendance already exists
      const existingPendingAttendance = await Attendance.findOne({
        date: attendanceDate,
        student: studentId,
        approvalStatus: 'Pending'
      });

      if (existingPendingAttendance) {
        // Update using findOneAndUpdate
        await Attendance.findOneAndUpdate(
          { _id: existingPendingAttendance._id },
          {
            $set: {
              status: status,
              remarks: remarks || '',
              markedBy: req.user.id,
              updatedAt: new Date(),
              ...studentDetails
            }
          },
          { new: true }
        );
        results.updated++;
      } else {
        // Create new attendance with all fields
        const attendanceData = {
          date: attendanceDate,
          student: studentId,
          ...studentDetails,
          status,
          remarks: remarks || '',
          markedBy: req.user.id,
          approvalStatus: 'Pending',
          updatedAt: new Date()
        };
        
        await Attendance.create(attendanceData);
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
    message: `Attendance marked and pending approval: ${results.created} created, ${results.updated} updated, ${results.failed} failed`
  });
});

// @desc    Update teacher's pending attendance (for today only)
// @route   PUT /api/v1/attendance/teacher/update
// @access  Private (Teacher)
// @desc    Update teacher's pending attendance (for today only)
// @route   PUT /api/v1/attendance/teacher/update
// @access  Private (Teacher)
export const updateAttendanceTeacher = asyncHandler(async (req, res) => {
  const { date, students: attendanceRecords } = req.body;
  
  if (!date || !attendanceRecords || !Array.isArray(attendanceRecords)) {
    return res.status(400).json({
      success: false,
      error: 'Date and students array are required'
    });
  }

  const attendanceDate = new Date(date);
  
  const results = {
    updated: 0,
    failed: 0,
    errors: []
  };

  // Process each attendance record
  for (const record of attendanceRecords) {
    try {
      const { studentId, status, remarks } = record;
      
      // Find existing pending attendance marked by this teacher
      const existingAttendance = await Attendance.findOne({
        date: attendanceDate,
        student: studentId,
        markedBy: req.user.id,
        approvalStatus: 'Pending'
      });

      if (!existingAttendance) {
        results.failed++;
        results.errors.push(`No pending attendance found for student: ${studentId}`);
        continue;
      }

      // Get student details to update in attendance record
      const student = await Student.findById(studentId);
      if (!student) {
        results.failed++;
        results.errors.push(`Student not found: ${studentId}`);
        continue;
      }

      // Update pending attendance WITH STUDENT DETAILS
      existingAttendance.status = status;
      existingAttendance.remarks = remarks || '';
      existingAttendance.updatedAt = new Date();
      // ADD/UPDATE STUDENT DETAILS
      existingAttendance.studentName = `${student.firstName} ${student.lastName || ''}`.trim();
      existingAttendance.rollNo = student.rollNo;
      existingAttendance.class = student.currentClass;
      existingAttendance.section = student.section;
      
      await existingAttendance.save();
      results.updated++;
      console.log(`✅ Updated teacher attendance details for: ${existingAttendance.studentName}`);

    } catch (error) {
      results.failed++;
      results.errors.push(`Error for student ${record.studentId}: ${error.message}`);
    }
  }

  res.status(200).json({
    success: true,
    data: results,
    message: `Attendance updated: ${results.updated} updated, ${results.failed} failed`
  });
});

// @desc    Approve pending attendance
// @route   PUT /api/v1/attendance/approve/:id
// @access  Private (Admin)
// @desc    Approve pending attendance
// @route   POST /api/v1/attendance/:id/approve  // CHANGED from PUT to POST
// @access  Private (Admin)
export const approveAttendance = asyncHandler(async (req, res) => {
  const attendance = await Attendance.findById(req.params.id);
  
  if (!attendance) {
    return res.status(404).json({
      success: false,
      error: 'Attendance record not found'
    });
  }

  if (attendance.approvalStatus === 'Approved') {
    return res.status(400).json({
      success: false,
      error: 'Attendance already approved'
    });
  }

  // Update approval status
  attendance.approvalStatus = 'Approved';
  attendance.approvedBy = req.user.id; // ADD THIS
  attendance.approvedAt = new Date(); // ADD THIS
  attendance.updatedAt = new Date();
  await attendance.save();
  
  // Update student's attendance summary
  await updateStudentAttendanceSummary(attendance.student);

  res.status(200).json({
    success: true,
    data: attendance,
    message: 'Attendance approved successfully'
  });
});

// @desc    Reject pending attendance
// @route   POST /api/v1/attendance/:id/reject  // CHANGED from PUT to POST
// @access  Private (Admin)
export const rejectAttendance = asyncHandler(async (req, res) => {
  const { reason } = req.body; // CHANGED from rejectionReason to reason
  const attendance = await Attendance.findById(req.params.id);
  
  if (!attendance) {
    return res.status(404).json({
      success: false,
      error: 'Attendance record not found'
    });
  }

  if (attendance.approvalStatus === 'Approved') {
    return res.status(400).json({
      success: false,
      error: 'Cannot reject approved attendance'
    });
  }

  // Update approval status to rejected
  attendance.approvalStatus = 'Rejected';
  attendance.remarks = reason ? `Rejected: ${reason}` : 'Attendance rejected without reason';
  attendance.updatedAt = new Date();
  await attendance.save();

  res.status(200).json({
    success: true,
    data: attendance,
    message: 'Attendance rejected successfully'
  });
});

// @desc    Bulk approve attendance for a class on specific date
// @route   POST /api/v1/attendance/bulk-approve  // CHANGED from PUT to POST
// @access  Private (Admin)
// @desc    Bulk approve attendance for a class on specific date
// @route   POST /api/v1/attendance/bulk-approve
// @access  Private (Admin)
export const bulkApproveAttendance = asyncHandler(async (req, res) => {
  const { date, class: className, section } = req.body;
  
  if (!date || !className || !section) {
    return res.status(400).json({
      success: false,
      error: 'Date, class, and section are required'
    });
  }

  const attendanceDate = new Date(date);
  attendanceDate.setHours(0, 0, 0, 0);
  
  const nextDay = new Date(attendanceDate);
  nextDay.setDate(nextDay.getDate() + 1);

  console.log('Bulk approve - Looking for pending attendance:');
  console.log('Date range:', attendanceDate, 'to', nextDay);
  console.log('Class:', className);
  console.log('Section:', section);

  // Find all pending attendance for the class on this date
  const pendingAttendance = await Attendance.find({
    date: {
      $gte: attendanceDate,
      $lt: nextDay
    },
    class: className,
    section: section,
    approvalStatus: 'Pending'
  }).populate('student', 'firstName lastName rollNo currentClass section');

  console.log('Found pending records:', pendingAttendance.length);

  if (pendingAttendance.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'No pending attendance found for this date and class'
    });
  }

  // Approve all pending attendance
  const approvedIds = [];
  for (const attendance of pendingAttendance) {
    try {
      // If student details are missing, populate them
      if (!attendance.studentName && attendance.student) {
        attendance.studentName = `${attendance.student.firstName} ${attendance.student.lastName || ''}`.trim();
        attendance.rollNo = attendance.student.rollNo;
        attendance.class = attendance.student.currentClass;
        attendance.section = attendance.student.section;
      }
      
      attendance.approvalStatus = 'Approved';
      attendance.approvedBy = req.user.id;
      attendance.approvedAt = new Date();
      attendance.updatedAt = new Date();
      await attendance.save();
      
      // Update student's attendance summary
      await updateStudentAttendanceSummary(attendance.student._id || attendance.student);
      
      approvedIds.push(attendance._id);
      console.log(`✅ Bulk approved: ${attendance.studentName || 'Unknown student'}`);
    } catch (error) {
      console.error('Error approving attendance:', error);
    }
  }

  res.status(200).json({
    success: true,
    data: {
      approvedCount: approvedIds.length,
      approvedIds: approvedIds
    },
    message: `${approvedIds.length} attendance records approved successfully`
  });
});

// @desc    Get all pending attendance (for admin dashboard)
// @route   GET /api/v1/attendance/pending
// @access  Private (Admin)
export const getPendingAttendance = asyncHandler(async (req, res) => {
  const { date, class: className, section, page = 1, limit = 20 } = req.query;
  
  const query = { approvalStatus: 'Pending' };  // Note: capital 'P'
  
  if (date) {
    query.date = new Date(date);
  }
  
  if (className) query.class = className;
  if (section) query.section = section;

  const pendingAttendance = await Attendance.find(query)
    .populate('student', 'firstName lastName rollNo admissionNo')
    .populate('markedBy', 'name email')
    .sort({ date: -1, class: 1, section: 1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .lean();

  const total = await Attendance.countDocuments(query);

  // Group by date and class
  const groupedByDate = {};
  pendingAttendance.forEach(record => {
    const dateKey = format(record.date, 'yyyy-MM-dd');
    const classKey = `${record.class}-${record.section}`;
    
    if (!groupedByDate[dateKey]) {
      groupedByDate[dateKey] = {};
    }
    
    if (!groupedByDate[dateKey][classKey]) {
      groupedByDate[dateKey][classKey] = [];
    }
    
    groupedByDate[dateKey][classKey].push(record);
  });

  res.status(200).json({
    success: true,
    data: {
      pendingAttendance,
      groupedByDate,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page)
    }
  });
});

// @desc    Get attendance statistics (updated for approval system)
// @route   GET /api/v1/attendance/stats
// @access  Private (Admin)
export const getAttendanceStats = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Get today's pending attendance count
  const todayPendingCount = await Attendance.countDocuments({
    date: {
      $gte: today,
      $lt: tomorrow
    },
    approvalStatus: 'Pending'  // Note: capital 'P'
  });

  // Get total pending attendance count
  const totalPendingCount = await Attendance.countDocuments({
    approvalStatus: 'Pending'  // Note: capital 'P'
  });

  // Get today's approved attendance
  const todayApprovedAttendance = await Attendance.find({
    date: {
      $gte: today,
      $lt: tomorrow
    },
    approvalStatus: 'Approved'  // Note: capital 'A'
  });

  // Get this month's approved attendance
  const startOfMonthDate = startOfMonth(today);
  const endOfMonthDate = endOfMonth(today);
  
  const monthApprovedAttendance = await Attendance.find({
    date: {
      $gte: startOfMonthDate,
      $lte: endOfMonthDate
    },
    approvalStatus: 'Approved'  // Note: capital 'A'
  });

  // Count by status for today
  const todayStats = todayApprovedAttendance.reduce((acc, curr) => {
    acc[curr.status] = (acc[curr.status] || 0) + 1;
    acc.total = (acc.total || 0) + 1;
    return acc;
  }, {});

  // Count by status for month
  const monthStats = monthApprovedAttendance.reduce((acc, curr) => {
    acc[curr.status] = (acc[curr.status] || 0) + 1;
    acc.total = (acc.total || 0) + 1;
    return acc;
  }, {});

  res.status(200).json({
    success: true,
    data: {
      pendingStats: {
        todayPending: todayPendingCount,
        totalPending: totalPendingCount
      },
      today: {
        date: format(today, 'yyyy-MM-dd'),
        total: todayStats.total || 0,
        present: todayStats.Present || 0,
        absent: todayStats.Absent || 0,
        leave: todayStats.Leave || 0,
        percentage: todayStats.total ? ((todayStats.Present || 0) / todayStats.total * 100).toFixed(1) : 0
      },
      month: {
        month: format(today, 'MMMM yyyy'),
        total: monthStats.total || 0,
        present: monthStats.Present || 0,
        absent: monthStats.Absent || 0,
        leave: monthStats.Leave || 0,
        percentage: monthStats.total ? ((monthStats.Present || 0) / monthStats.total * 100).toFixed(1) : 0
      }
    }
  });
});

// @desc    Get student attendance report (UPDATED for approval system)
// @route   GET /api/v1/attendance/student/:studentId
// @access  Private (Admin/Teacher)
export const getStudentAttendance = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const { year, month } = req.query;
  
  const student = await Student.findById(studentId);
  if (!student) {
    return res.status(404).json({
      success: false,
      error: 'Student not found'
    });
  }

  let startDate, endDate;
  
  if (year && month) {
    startDate = new Date(year, month - 1, 1);
    endDate = new Date(year, month, 0);
  } else {
    // Default to current month
    const now = new Date();
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  }

  // Get APPROVED attendance for the period
  const attendance = await Attendance.find({
    student: studentId,
    date: {
      $gte: startDate,
      $lte: endDate
    },
    approvalStatus: 'Approved' // Note: capital 'A'
  }).sort('date').lean();

  // Get holidays
  const holidays = await Holiday.find({
    date: {
      $gte: startDate,
      $lte: endDate
    }
  }).lean();

  // Get all dates in the period
  const dates = eachDayOfInterval({ start: startDate, end: endDate });
  
  const attendanceData = dates.map(date => {
    const attendanceRecord = attendance.find(a => 
      format(new Date(a.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
    const holiday = holidays.find(h => 
      format(new Date(h.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
    const isSundayDate = isSunday(date);

    let status = 'N/A';
    if (isSundayDate) {
      status = 'Sunday';
    } else if (holiday) {
      status = `Holiday (${holiday.title})`;
    } else if (attendanceRecord) {
      status = attendanceRecord.status;
    } else {
      status = 'Not Marked';
    }

    return {
      date,
      day: format(date, 'EEEE'),
      status,
      remarks: attendanceRecord?.remarks || '',
      workingDay: !isSundayDate && !holiday,
      approvalStatus: attendanceRecord?.approvalStatus || null
    };
  });

  // Calculate statistics (only approved attendance)
  const workingDays = attendanceData.filter(d => d.workingDay).length;
  const presentDays = attendanceData.filter(d => d.status === 'Present').length;
  const absentDays = attendanceData.filter(d => d.status === 'Absent').length;
  const leaveDays = attendanceData.filter(d => d.status === 'Leave').length;
  const notMarked = attendanceData.filter(d => d.status === 'Not Marked').length;
  const attendancePercentage = workingDays > 0 ? ((presentDays / workingDays) * 100).toFixed(1) : 0;

  res.status(200).json({
    success: true,
    data: {
      student: {
        name: `${student.firstName} ${student.lastName || ''}`.trim(),
        rollNo: student.rollNo,
        class: student.currentClass,
        section: student.section
      },
      period: {
        startDate,
        endDate,
        workingDays,
        sundays: attendanceData.filter(d => d.status === 'Sunday').length,
        holidays: attendanceData.filter(d => d.status.includes('Holiday')).length
      },
      summary: {
        present: presentDays,
        absent: absentDays,
        leave: leaveDays,
        notMarked: notMarked,
        attendancePercentage
      },
      attendance: attendanceData
    }
  });
});

// @desc    Get monthly attendance report (UPDATED for approval system)
// @route   GET /api/v1/attendance/monthly
// @access  Private (Admin)
export const getMonthlyAttendance = asyncHandler(async (req, res) => {
  const { year, month, class: className, section } = req.query;
  
  if (!year || !month || !className || !section) {
    return res.status(400).json({
      success: false,
      error: 'Year, month, class, and section are required'
    });
  }

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  
  // Get all dates in the month
  const dates = eachDayOfInterval({ start: startDate, end: endDate });
  
  // Get all holidays in the month
  const holidays = await Holiday.find({
    date: {
      $gte: startDate,
      $lte: endDate
    }
  }).lean();

  // Get all students in the class
  const students = await Student.find({
    currentClass: className,
    section: section,
    status: 'Active'
  })
  .select('_id firstName lastName rollNo')
  .sort('rollNo')
  .lean();

  // Get APPROVED attendance for the month for these students
  const attendance = await Attendance.find({
    date: {
      $gte: startDate,
      $lte: endDate
    },
    student: { $in: students.map(s => s._id) },
    approvalStatus: 'Approved' // Note: capital 'A'
  }).lean();

  // Process each date
  const monthlyData = dates.map(date => {
    const isSundayDate = isSunday(date);
    const holiday = holidays.find(h => 
      format(new Date(h.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );

    if (isSundayDate || holiday) {
      return {
        date: date,
        day: format(date, 'EEEE'),
        isSunday: isSundayDate,
        holiday: holiday ? holiday.title : null,
        totalStudents: students.length,
        present: 0,
        absent: 0,
        leave: 0,
        workingDay: false,
        percentage: 0
      };
    }

    // Get approved attendance for this date
    const dateAttendance = attendance.filter(a => 
      format(new Date(a.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );

    const present = dateAttendance.filter(a => a.status === 'Present').length;
    const absent = dateAttendance.filter(a => a.status === 'Absent').length;
    const leave = dateAttendance.filter(a => a.status === 'Leave').length;
    const total = students.length;
    
    return {
      date: date,
      day: format(date, 'EEEE'),
      isSunday: false,
      holiday: null,
      totalStudents: total,
      present,
      absent,
      leave,
      workingDay: true,
      percentage: total > 0 ? ((present / total) * 100).toFixed(1) : 0
    };
  });

  // Calculate monthly summary
  const workingDays = monthlyData.filter(d => d.workingDay).length;
  const totalPresent = monthlyData.reduce((sum, day) => sum + day.present, 0);
  const totalAbsent = monthlyData.reduce((sum, day) => sum + day.absent, 0);
  const totalLeave = monthlyData.reduce((sum, day) => sum + day.leave, 0);
  const totalPossible = workingDays * students.length;
  const monthlyPercentage = totalPossible > 0 ? ((totalPresent / totalPossible) * 100).toFixed(1) : 0;

  res.status(200).json({
    success: true,
    data: {
      year,
      month,
      class: className,
      section: section,
      totalStudents: students.length,
      workingDays,
      holidays: monthlyData.filter(d => d.holiday).length,
      sundays: monthlyData.filter(d => d.isSunday).length,
      summary: {
        totalPresent,
        totalAbsent,
        totalLeave,
        monthlyPercentage
      },
      dailyData: monthlyData
    }
  });
});

// Helper function to update student attendance summary (only approved attendance)
async function updateStudentAttendanceSummary(studentId) {
  try {
    const student = await Student.findById(studentId);
    if (!student) return;

    // Get current month APPROVED attendance
    const today = new Date();
    const startOfMonthDate = startOfMonth(today);
    const endOfMonthDate = endOfMonth(today);

    const monthAttendance = await Attendance.find({
      student: studentId,
      date: {
        $gte: startOfMonthDate,
        $lte: endOfMonthDate
      },
      approvalStatus: 'Approved' // Note: capital 'A'
    });

    // Get working days (excluding Sundays and holidays)
    const dates = eachDayOfInterval({ start: startOfMonthDate, end: endOfMonthDate });
    const holidays = await Holiday.find({
      date: {
        $gte: startOfMonthDate,
        $lte: endOfMonthDate
      }
    });

    const workingDays = dates.filter(date => {
      if (isSunday(date)) return false;
      const holiday = holidays.find(h => 
        format(new Date(h.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
      );
      return !holiday;
    }).length;

    // Count approved attendance
    const presentDays = monthAttendance.filter(a => a.status === 'Present').length;
    const absentDays = monthAttendance.filter(a => a.status === 'Absent').length;
    const leaveDays = monthAttendance.filter(a => a.status === 'Leave').length;

    // Update student record
    student.attendanceSummary = {
      totalDays: workingDays,
      presentDays,
      absentDays,
      leaveDays,
      percentage: workingDays > 0 ? ((presentDays / workingDays) * 100).toFixed(1) : 0
    };

    await student.save();
  } catch (error) {
    console.error('Error updating student attendance summary:', error);
  }
}

// @desc    Get attendance report for date range
// @route   GET /api/v1/attendance/report
// @access  Private (Admin)
export const getAttendanceReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, class: className, section } = req.query;
  
  if (!startDate || !endDate || !className || !section) {
    return res.status(400).json({
      success: false,
      error: 'Start date, end date, class, and section are required'
    });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Validate date range
  if (start > end) {
    return res.status(400).json({
      success: false,
      error: 'Start date cannot be after end date'
    });
  }

  // Get all students in the class
  const students = await Student.find({
    currentClass: className,
    section: section,
    status: 'Active'
  })
  .select('_id firstName lastName rollNo fatherName')
  .sort('rollNo')
  .lean();

  // Get APPROVED attendance for the date range
  const attendance = await Attendance.find({
    class: className,
    section: section,
    date: {
      $gte: start,
      $lte: end
    },
    approvalStatus: 'Approved'
  })
  .select('student date status remarks')
  .lean();

  // Get holidays in the period
  const holidays = await Holiday.find({
    date: {
      $gte: start,
      $lte: end
    }
  }).select('date title type').lean();

  // Get all dates in the period
  const dates = eachDayOfInterval({ start, end });
  
  // Calculate working days (excluding Sundays and holidays)
  const workingDays = dates.filter(date => {
    if (isSunday(date)) return false;
    const holiday = holidays.find(h => 
      format(new Date(h.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
    return !holiday;
  }).length;

  // Process each student's attendance
  const studentReports = students.map(student => {
    const studentAttendance = attendance.filter(a => 
      a.student.toString() === student._id.toString()
    );
    
    const presentDays = studentAttendance.filter(a => a.status === 'Present').length;
    const absentDays = studentAttendance.filter(a => a.status === 'Absent').length;
    const leaveDays = studentAttendance.filter(a => a.status === 'Leave').length;
    
    // Calculate percentage based on working days (excluding leave days)
    const effectiveDays = workingDays - leaveDays;
    const attendancePercentage = effectiveDays > 0 
      ? ((presentDays / workingDays) * 100).toFixed(2) // Working days as base, not effective days
      : 0;

    return {
      studentId: student._id,
      rollNo: student.rollNo,
      name: `${student.firstName} ${student.lastName || ''}`.trim(),
      fatherName: student.fatherName,
      presentDays,
      absentDays,
      leaveDays,
      attendancePercentage: parseFloat(attendancePercentage),
      status: attendancePercentage >= 75 ? 'Good' : 
              attendancePercentage >= 60 ? 'Warning' : 'Critical'
    };
  });

  // Calculate class summary
  const totalPresent = studentReports.reduce((sum, student) => sum + student.presentDays, 0);
  const totalAbsent = studentReports.reduce((sum, student) => sum + student.absentDays, 0);
  const totalLeave = studentReports.reduce((sum, student) => sum + student.leaveDays, 0);
  
  const classAttendancePercentage = workingDays > 0 && students.length > 0
    ? ((totalPresent / (workingDays * students.length)) * 100).toFixed(2)
    : 0;

  // Get defaulters (attendance < 75%)
  const defaulters = studentReports.filter(student => 
    parseFloat(student.attendancePercentage) < 75
  );

  res.status(200).json({
    success: true,
    data: {
      reportPeriod: {
        startDate: start,
        endDate: end,
        className,
        section,
        totalDays: dates.length,
        workingDays,
        holidays: holidays.length,
        sundays: dates.filter(date => isSunday(date)).length
      },
      classSummary: {
        totalStudents: students.length,
        totalPresent,
        totalAbsent,
        totalLeave,
        classAttendancePercentage: parseFloat(classAttendancePercentage)
      },
      studentReports,
      defaulters,
      defaultersCount: defaulters.length,
      attendanceDistribution: {
        good: studentReports.filter(s => s.status === 'Good').length,
        warning: studentReports.filter(s => s.status === 'Warning').length,
        critical: studentReports.filter(s => s.status === 'Critical').length
      },
      holidays // Include holidays data for the report
    }
  });
});