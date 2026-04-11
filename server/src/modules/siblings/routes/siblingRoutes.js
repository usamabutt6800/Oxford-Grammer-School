// server/src/modules/siblings/routes/siblingRoutes.js
import express from 'express';
import { getSiblingGroups, getSiblingGroupDetail, siblingPayment } from '../controllers/siblingController.js';
import { protect, authorize } from '../../../middlewares/auth.js';

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

router.get('/', getSiblingGroups);
router.get('/group', getSiblingGroupDetail);
router.post('/pay', siblingPayment);

export default router;