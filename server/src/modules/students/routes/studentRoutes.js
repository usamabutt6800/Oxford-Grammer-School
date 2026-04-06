import express from 'express';
import {
  getStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  getClasses  // Add this import
} from '../controllers/studentController.js';
import { protect, authorize } from '../../../middlewares/auth.js';

const router = express.Router();

router.use(protect);
router.use(authorize('admin', 'teacher'));

// Add this route BEFORE the /:id route
router.route('/classes')
  .get(getClasses);

router.route('/')
  .get(getStudents)
  .post(authorize('admin'), createStudent);

router.route('/:id')
  .get(getStudent)
  .put(authorize('admin'), updateStudent)
  .delete(authorize('admin'), deleteStudent);

export default router;