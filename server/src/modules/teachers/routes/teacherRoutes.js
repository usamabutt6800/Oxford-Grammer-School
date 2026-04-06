
import express from 'express';
import {
  getTeachers,
  getTeacher,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  getTeacherStats,
  getTeachersList
} from '../controllers/teacherController.js';
import {
  getMyProfile,
  getMyClasses,
  getMyStudents,
  getClassAttendance,
  markClassAttendance,
  getDashboardStats,
  checkTodayAttendance,      // NEW
  getAttendanceReport        // NEW
} from '../controllers/teacherDashboardController.js';
import { protect, authorize } from '../../../middlewares/auth.js';

const router = express.Router();

// All routes protected
router.use(protect);

// ========== TEACHER DASHBOARD ROUTES (for teachers themselves) ==========
router.route('/me')
  .get(authorize('teacher'), getMyProfile);

router.route('/me/classes')
  .get(authorize('teacher'), getMyClasses);

router.route('/me/students')
  .get(authorize('teacher'), getMyStudents);

router.route('/me/attendance')
  .get(authorize('teacher'), getClassAttendance)
  .post(authorize('teacher'), markClassAttendance);

// NEW ROUTES - Add these
router.route('/me/attendance/check')
  .get(authorize('teacher'), checkTodayAttendance);

router.route('/me/attendance/report')
  .get(authorize('teacher'), getAttendanceReport);

router.route('/me/stats')
  .get(authorize('teacher'), getDashboardStats);

// ========== ADMIN ROUTES (for admin to manage teachers) ==========
router.route('/')
  .get(authorize('admin'), getTeachers)
  .post(authorize('admin'), createTeacher);

router.route('/stats/summary')
  .get(authorize('admin'), getTeacherStats);

router.route('/list')
  .get(authorize('admin', 'teacher'), getTeachersList);

router.route('/:id')
  .get(authorize('admin'), getTeacher)
  .put(authorize('admin', 'teacher'), updateTeacher)
  .delete(authorize('admin'), deleteTeacher);

export default router;
