
import express from 'express';
import {
  getHolidays,
  getHoliday,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  getHolidayCalendar
} from '../controllers/holidayController.js';
import { protect, authorize } from '../../../middlewares/auth.js';

const router = express.Router();

// All routes protected
router.use(protect);

// Public routes (admin and teacher)
router.route('/calendar/:year')
  .get(authorize('admin', 'teacher'), getHolidayCalendar);

// Admin only routes
router.route('/')
  .get(authorize('admin'), getHolidays)
  .post(authorize('admin'), createHoliday);

router.route('/:id')
  .get(authorize('admin'), getHoliday)
  .put(authorize('admin'), updateHoliday)
  .delete(authorize('admin'), deleteHoliday);

export default router;