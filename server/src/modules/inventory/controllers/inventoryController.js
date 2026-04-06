// server/src/modules/inventory/controllers/inventoryController.js

import InventoryItem from '../models/InventoryItem.js';
import InventoryTransaction from '../models/InventoryTransaction.js';
import asyncHandler from '../../../middlewares/asyncHandler.js';

// ============ ITEM MANAGEMENT ============

// @desc    Get all inventory items
// @route   GET /api/v1/inventory/items
// @access  Private (Admin)
export const getItems = asyncHandler(async (req, res) => {
  const { category, search, status, location, lowStock } = req.query;
  
  let query = {};
  if (category) query.category = category;
  if (status) query.status = status;
  if (location) query.location = location;
  if (lowStock === 'true') {
    query.$expr = { $lte: ['$quantity', '$minQuantity'] };
  }
  if (search) {
    query.name = { $regex: search, $options: 'i' };
  }
  
  const items = await InventoryItem.find(query)
    .populate('createdBy', 'name email')
    .sort({ category: 1, name: 1 });
  
  res.status(200).json({
    success: true,
    count: items.length,
    data: items
  });
});

// @desc    Get single inventory item
// @route   GET /api/v1/inventory/items/:id
// @access  Private (Admin)
export const getItemById = asyncHandler(async (req, res) => {
  const item = await InventoryItem.findById(req.params.id)
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email');
  
  if (!item) {
    return res.status(404).json({
      success: false,
      error: 'Item not found'
    });
  }
  
  // Get transaction history
  const transactions = await InventoryTransaction.find({ item: item._id })
    .populate('performedBy', 'name')
    .sort({ transactionDate: -1 })
    .limit(20);
  
  res.status(200).json({
    success: true,
    data: { item, transactions }
  });
});

// @desc    Create new inventory item
// @route   POST /api/v1/inventory/items
// @access  Private (Admin)
export const createItem = asyncHandler(async (req, res) => {
  const { name, category, quantity, minQuantity, maxQuantity, unit, location, purchasePrice, sellingPrice, supplier, description } = req.body;
  
  // Check if item already exists
  const existingItem = await InventoryItem.findOne({ name });
  if (existingItem) {
    return res.status(400).json({
      success: false,
      error: 'Item with this name already exists'
    });
  }
  
  const item = await InventoryItem.create({
    name,
    category: category || 'Other',
    quantity: quantity || 0,
    minQuantity: minQuantity || 10,
    maxQuantity: maxQuantity || 1000,
    unit: unit || 'piece',
    location: location || 'Store Room',
    purchasePrice: purchasePrice || 0,
    sellingPrice: sellingPrice || 0,
    supplier,
    description,
    createdBy: req.user.id
  });
  
  // Create initial transaction if quantity > 0
  if (quantity > 0) {
    await InventoryTransaction.create({
      item: item._id,
      itemName: item.name,
      transactionType: 'IN',
      quantity: quantity,
      previousQuantity: 0,
      newQuantity: quantity,
      reason: 'Initial stock added',
      performedBy: req.user.id
    });
  }
  
  res.status(201).json({
    success: true,
    data: item,
    message: 'Item created successfully'
  });
});

// @desc    Update inventory item
// @route   PUT /api/v1/inventory/items/:id
// @access  Private (Admin)
export const updateItem = asyncHandler(async (req, res) => {
  const item = await InventoryItem.findById(req.params.id);
  
  if (!item) {
    return res.status(404).json({
      success: false,
      error: 'Item not found'
    });
  }
  
  const updatedItem = await InventoryItem.findByIdAndUpdate(
    req.params.id,
    { ...req.body, updatedBy: req.user.id },
    { new: true, runValidators: true }
  );
  
  res.status(200).json({
    success: true,
    data: updatedItem,
    message: 'Item updated successfully'
  });
});

// @desc    Delete inventory item
// @route   DELETE /api/v1/inventory/items/:id
// @access  Private (Admin)
export const deleteItem = asyncHandler(async (req, res) => {
  const item = await InventoryItem.findById(req.params.id);
  
  if (!item) {
    return res.status(404).json({
      success: false,
      error: 'Item not found'
    });
  }
  
  await item.deleteOne();
  
  res.status(200).json({
    success: true,
    message: 'Item deleted successfully'
  });
});

// ============ STOCK MANAGEMENT ============

// @desc    Update stock (IN/OUT/ADJUSTMENT)
// @route   POST /api/v1/inventory/stock/update
// @access  Private (Admin)
export const updateStock = asyncHandler(async (req, res) => {
  const { itemId, transactionType, quantity, reason, issuedTo, issuedToStudent, issuedToTeacher, remarks } = req.body;
  
  const item = await InventoryItem.findById(itemId);
  if (!item) {
    return res.status(404).json({
      success: false,
      error: 'Item not found'
    });
  }
  
  let newQuantity;
  let previousQuantity = item.quantity;
  
  switch (transactionType) {
    case 'IN':
      newQuantity = item.quantity + quantity;
      break;
    case 'OUT':
      if (item.quantity < quantity) {
        return res.status(400).json({
          success: false,
          error: `Insufficient stock. Available: ${item.quantity}`
        });
      }
      newQuantity = item.quantity - quantity;
      break;
    case 'ADJUSTMENT':
      newQuantity = quantity;
      break;
    default:
      return res.status(400).json({
        success: false,
        error: 'Invalid transaction type'
      });
  }
  
  // Update item quantity
  item.quantity = newQuantity;
  await item.save();
  
  // Create transaction record
  const transaction = await InventoryTransaction.create({
    item: item._id,
    itemName: item.name,
    transactionType,
    quantity: transactionType === 'ADJUSTMENT' ? Math.abs(quantity - previousQuantity) : quantity,
    previousQuantity,
    newQuantity,
    reason,
    issuedTo,
    issuedToStudent,
    issuedToTeacher,
    performedBy: req.user.id,
    remarks
  });
  
  res.status(200).json({
    success: true,
    data: {
      item,
      transaction
    },
    message: `Stock updated successfully. New quantity: ${newQuantity}`
  });
});

// @desc    Get stock alerts (low stock items)
// @route   GET /api/v1/inventory/stock/alerts
// @access  Private (Admin)
export const getStockAlerts = asyncHandler(async (req, res) => {
  const lowStockItems = await InventoryItem.find({
    $expr: { $lte: ['$quantity', '$minQuantity'] },
    status: 'Active'
  }).sort({ quantity: 1 });
  
  const outOfStock = lowStockItems.filter(item => item.quantity === 0);
  const lowStock = lowStockItems.filter(item => item.quantity > 0);
  
  res.status(200).json({
    success: true,
    data: {
      totalAlerts: lowStockItems.length,
      outOfStock: outOfStock.length,
      lowStock: lowStock.length,
      items: lowStockItems
    }
  });
});

// ============ TRANSACTIONS ============

// @desc    Get transaction history for an item
// @route   GET /api/v1/inventory/transactions/item/:itemId
// @access  Private (Admin)
export const getItemTransactions = asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  const { limit = 50, page = 1 } = req.query;
  
  const transactions = await InventoryTransaction.find({ item: itemId })
    .populate('performedBy', 'name email')
    .populate('issuedToStudent', 'firstName lastName admissionNo')
    .populate('issuedToTeacher', 'name email')
    .sort({ transactionDate: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
  
  const total = await InventoryTransaction.countDocuments({ item: itemId });
  
  res.status(200).json({
    success: true,
    data: {
      transactions,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    }
  });
});

// @desc    Get all transactions with filters
// @route   GET /api/v1/inventory/transactions
// @access  Private (Admin)
export const getAllTransactions = asyncHandler(async (req, res) => {
  const { startDate, endDate, transactionType, category } = req.query;
  
  let query = {};
  
  if (startDate && endDate) {
    query.transactionDate = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }
  
  if (transactionType) {
    query.transactionType = transactionType;
  }
  
  const transactions = await InventoryTransaction.find(query)
    .populate('item', 'name category')
    .populate('performedBy', 'name')
    .populate('issuedToStudent', 'firstName lastName admissionNo')
    .sort({ transactionDate: -1 })
    .limit(100);
  
  res.status(200).json({
    success: true,
    count: transactions.length,
    data: transactions
  });
});

// ============ DASHBOARD STATS ============

// @desc    Get inventory dashboard stats
// @route   GET /api/v1/inventory/stats
// @access  Private (Admin)
export const getStats = asyncHandler(async (req, res) => {
  const totalItems = await InventoryItem.countDocuments();
  const totalCategories = await InventoryItem.distinct('category');
  
  const lowStockItems = await InventoryItem.countDocuments({
    $expr: { $lte: ['$quantity', '$minQuantity'] }
  });
  
  const outOfStock = await InventoryItem.countDocuments({ quantity: 0 });
  const activeItems = await InventoryItem.countDocuments({ status: 'Active' });
  
  // Total inventory value
  const items = await InventoryItem.find();
  const totalValue = items.reduce((sum, item) => sum + (item.purchasePrice * item.quantity), 0);
  
  // Recent transactions
  const recentTransactions = await InventoryTransaction.find()
    .populate('item', 'name category')
    .populate('performedBy', 'name')
    .sort({ transactionDate: -1 })
    .limit(10);
  
  // Category wise breakdown
  const categoryBreakdown = {};
  items.forEach(item => {
    if (!categoryBreakdown[item.category]) {
      categoryBreakdown[item.category] = { count: 0, quantity: 0, value: 0 };
    }
    categoryBreakdown[item.category].count++;
    categoryBreakdown[item.category].quantity += item.quantity;
    categoryBreakdown[item.category].value += item.purchasePrice * item.quantity;
  });
  
  res.status(200).json({
    success: true,
    data: {
      summary: {
        totalItems,
        totalCategories: totalCategories.length,
        activeItems,
        lowStock: lowStockItems,
        outOfStock,
        totalValue
      },
      categoryBreakdown,
      recentTransactions
    }
  });
});

// @desc    Get categories
// @route   GET /api/v1/inventory/categories
// @access  Private (Admin)
export const getCategories = asyncHandler(async (req, res) => {
  const categories = await InventoryItem.distinct('category');
  
  res.status(200).json({
    success: true,
    data: categories
  });
});

// @desc    Get locations
// @route   GET /api/v1/inventory/locations
// @access  Private (Admin)
export const getLocations = asyncHandler(async (req, res) => {
  const locations = await InventoryItem.distinct('location');
  
  res.status(200).json({
    success: true,
    data: locations
  });
});