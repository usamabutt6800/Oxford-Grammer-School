// server/src/modules/canteen/routes/canteenRoutes.js

import express from 'express';
import {
  getItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  updateStock,
  recordSale,
  getTodaySales,
  getSalesReport,
  getStats,
  getCategories
} from '../controllers/canteenController.js';
import { protect, authorize } from '../../../middlewares/auth.js';

const router = express.Router();

// All routes require authentication and admin authorization
router.use(protect);
router.use(authorize('admin'));

// Stats and categories
router.route('/stats')
  .get(getStats);

router.route('/categories')
  .get(getCategories);

// Item routes
router.route('/items')
  .get(getItems)
  .post(createItem);

router.route('/items/:id')
  .get(getItemById)
  .put(updateItem)
  .delete(deleteItem);

router.route('/items/:id/stock')
  .patch(updateStock);

// Sales routes
router.route('/sales')
  .post(recordSale);

router.route('/sales/today')
  .get(getTodaySales);

router.route('/sales/report')
  .get(getSalesReport);

export default router;