
import express from 'express';
import {
  getFeeStructures,
  getFeeStructureByClass,
  createOrUpdateFeeStructure,
  deleteFeeStructure,
  getAllClassesWithFees
} from '../controllers/feeStructureController.js';
import { protect, authorize } from '../../../middlewares/auth.js';

const router = express.Router();

// All routes protected
router.use(protect);

// Admin only routes
router.route('/')
  .get(authorize('admin'), getFeeStructures)
  .post(authorize('admin'), createOrUpdateFeeStructure);

router.route('/all/classes')
  .get(authorize('admin'), getAllClassesWithFees);

router.route('/:class')
  .get(authorize('admin'), getFeeStructureByClass)
  .delete(authorize('admin'), deleteFeeStructure);

export default router;