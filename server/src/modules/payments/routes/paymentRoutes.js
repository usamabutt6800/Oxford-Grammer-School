// server/src/modules/payments/routes/paymentRoutes.js

import express from 'express';
import {
  createPayment,
  getStudentPaymentHistory,
  getAllPayments,
  getPaymentById,
  getPaymentSummary
} from '../controllers/paymentController.js';
import { protect, authorize } from '../../../middlewares/auth.js';

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

router.route('/create')
  .post(createPayment);

router.route('/student/:studentId')
  .get(getStudentPaymentHistory);

router.route('/summary')
  .get(getPaymentSummary);

router.route('/')
  .get(getAllPayments);

router.route('/:id')
  .get(getPaymentById);

export default router;