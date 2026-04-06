import express from 'express';
import {
  getAttendance,
  markAttendance,
  getMonthlyAttendance,
  getStudentAttendance,
  getAttendanceStats,
  markAttendanceTeacher,
  updateAttendanceTeacher,
  approveAttendance,
  rejectAttendance,
  bulkApproveAttendance,
  getPendingAttendance,
  getAttendanceReport
} from '../controllers/attendanceController.js';
import { protect, authorize } from '../../../middlewares/auth.js';

const router = express.Router();

// All routes protected
router.use(protect);

// ========== ATTENDANCE ROUTES ==========

// GET attendance & POST attendance (admin only for POST)
router.route('/')
  .get(authorize('admin', 'teacher'), getAttendance)
  .post(authorize('admin'), markAttendance); // Admin marks attendance directly

// Monthly attendance
router.route('/monthly')
  .get(authorize('admin', 'teacher'), getMonthlyAttendance);

// Student attendance
router.route('/student/:studentId')
  .get(authorize('admin', 'teacher'), getStudentAttendance);

// Attendance stats (admin only)
router.route('/stats')
  .get(authorize('admin'), getAttendanceStats);

// ========== TEACHER ATTENDANCE ROUTES ==========

// Teacher marks attendance (goes to pending) - Changed from PUT to POST
router.route('/teacher')
  .post(authorize('teacher'), markAttendanceTeacher);

// Teacher updates attendance
router.route('/teacher/update')
  .put(authorize('teacher'), updateAttendanceTeacher);

// ========== APPROVAL ROUTES (ADMIN ONLY) ==========

// NOTE: Changed from PUT to POST to match frontend service calls
// Single attendance approval
router.route('/:id/approve')
  .post(authorize('admin'), approveAttendance);

// Single attendance rejection
router.route('/:id/reject')
  .post(authorize('admin'), rejectAttendance);

// Bulk approve attendance - Changed from PUT to POST
router.route('/bulk-approve')
  .post(authorize('admin'), bulkApproveAttendance);

// Get pending attendance for admin
router.route('/pending')
  .get(authorize('admin'), getPendingAttendance);

// Report generation
router.route('/report')
  .get(authorize('admin'), getAttendanceReport);

export default router;