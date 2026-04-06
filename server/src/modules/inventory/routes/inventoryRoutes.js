// server/src/modules/inventory/routes/inventoryRoutes.js

import express from 'express';
import {
  getItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  updateStock,
  getStockAlerts,
  getItemTransactions,
  getAllTransactions,
  getStats,
  getCategories,
  getLocations
} from '../controllers/inventoryController.js';
import { protect, authorize } from '../../../middlewares/auth.js';

const router = express.Router();

// All routes require authentication and admin authorization
router.use(protect);
router.use(authorize('admin'));

// Stats and metadata
router.route('/stats')
  .get(getStats);

router.route('/categories')
  .get(getCategories);

router.route('/locations')
  .get(getLocations);

// Stock alerts
router.route('/stock/alerts')
  .get(getStockAlerts);

// Stock update
router.route('/stock/update')
  .post(updateStock);

// Transaction routes
router.route('/transactions')
  .get(getAllTransactions);

router.route('/transactions/item/:itemId')
  .get(getItemTransactions);

// Item routes
router.route('/items')
  .get(getItems)
  .post(createItem);

router.route('/items/:id')
  .get(getItemById)
  .put(updateItem)
  .delete(deleteItem);

export default router;