import express from 'express';
import {
  createExam,
  getExams,
  getExam,
  updateExam,
  deleteExam,
  submitExamResults,
  getExamResults,
  promoteStudentsAfterExam,
  getExamStats,
  getStudentsForExam
} from '../controllers/examController.js';
import { protect, authorize } from '../../../middlewares/auth.js';

const router = express.Router();

// All routes protected
router.use(protect);

// Admin only routes
router.route('/')
  .get(authorize('admin', 'teacher'), getExams)
  .post(authorize('admin'), createExam);

router.route('/:id')
  .get(authorize('admin', 'teacher'), getExam)
  .put(authorize('admin'), updateExam)
  .delete(authorize('admin'), deleteExam);

router.route('/:id/students')
  .get(authorize('admin'), getStudentsForExam);

router.route('/:id/results')
  .get(authorize('admin', 'teacher'), getExamResults)
  .post(authorize('admin'), submitExamResults);

router.route('/:id/promote')
  .post(authorize('admin'), promoteStudentsAfterExam);

router.route('/:id/stats')
  .get(authorize('admin'), getExamStats);

export default router;