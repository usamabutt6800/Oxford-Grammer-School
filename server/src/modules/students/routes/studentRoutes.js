// server/src/modules/students/routes/studentRoutes.js
import express from 'express';
import {
  getStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  getStudentStats,
  getClasses,
} from '../controllers/studentController.js';
import {
  getPromotionPreview,
  promoteStudents,
  getPromotionHistory,
} from '../controllers/promotionController.js';
import { protect, authorize } from '../../../middlewares/auth.js';

const router = express.Router();

router.use(protect);

// Stats — must be before /:id to avoid being caught as an id
router.get('/stats/summary', authorize('admin'), getStudentStats);
router.get('/classes', authorize('admin', 'teacher'), getClasses);

// Promotion routes — must be before /:id
router.get('/promotion/preview', authorize('admin'), getPromotionPreview);
router.post('/promotion/promote', authorize('admin'), promoteStudents);
router.get('/promotion/history', authorize('admin'), getPromotionHistory);

// Standard CRUD
router.route('/')
  .get(authorize('admin', 'teacher'), getStudents)
  .post(authorize('admin'), createStudent);

router.route('/:id')
  .get(authorize('admin', 'teacher'), getStudent)
  .put(authorize('admin'), updateStudent)
  .delete(authorize('admin'), deleteStudent);

export default router;