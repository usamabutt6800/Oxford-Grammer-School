// server/src/modules/fees/routes/feeRoutes.js

import express from 'express';
import {
  getFees,
  getFee,
  generateFees,
  bulkGenerateFees,
  updateFee,
  deleteFee,
  getFeeSummary,
  checkFeeGeneration,
  addCustomFeeItem,
  getFeeGenerationLogs,
  getOverdueFees,
  getStudentFeesByMonth,
  getStudentsWithFees  // Import the new controller
} from '../controllers/feeController.js';
import { protect, authorize } from '../../../middlewares/auth.js';

const router = express.Router();

// All routes require authentication and admin authorization
router.use(protect);
router.use(authorize('admin'));

// Fee listing and generation routes
router.route('/')
  .get(getFees);

// Get students with their fees for a specific month (NEW ENDPOINT)
router.route('/students-with-fees')
  .get(getStudentsWithFees);

// Overdue fees route - Get all overdue fees
router.route('/overdue')
  .get(getOverdueFees);

// Check if fees already generated for a class/month
router.route('/check-generation')
  .get(checkFeeGeneration);

// Generate fees for a class/month
router.route('/generate')
  .post(generateFees);

// Bulk generate fees for multiple students
router.route('/bulk-generate')
  .post(bulkGenerateFees);

// Fee statistics summary
router.route('/stats/summary')
  .get(getFeeSummary);

// Fee generation logs
router.route('/generation-logs')
  .get(getFeeGenerationLogs);

// Get fees for a specific student by month
router.route('/student/:studentId')
  .get(getStudentFeesByMonth);

// Individual fee operations (must be last to avoid conflicts with specific routes)
router.route('/:id')
  .get(getFee)
  .put(updateFee)
  .delete(deleteFee);

// Add custom fee item to a specific fee record
router.route('/:id/add-item')
  .post(addCustomFeeItem);

export default router;