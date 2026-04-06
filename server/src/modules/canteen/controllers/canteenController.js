// server/src/modules/canteen/controllers/canteenController.js

import CanteenItem from '../models/CanteenItem.js';
import CanteenSale from '../models/CanteenSale.js';
import Student from '../../students/models/Student.js';
import asyncHandler from '../../../middlewares/asyncHandler.js';
import { format, startOfMonth, endOfMonth } from 'date-fns';

// ============ ITEM MANAGEMENT ============

// @desc    Get all canteen items
// @route   GET /api/v1/canteen/items
// @access  Private (Admin)
export const getItems = asyncHandler(async (req, res) => {
  const { category, search, isAvailable } = req.query;
  
  let query = {};
  if (category) query.category = category;
  if (isAvailable !== undefined) query.isAvailable = isAvailable === 'true';
  if (search) {
    query.name = { $regex: search, $options: 'i' };
  }
  
  const items = await CanteenItem.find(query)
    .populate('createdBy', 'name email')
    .sort({ category: 1, name: 1 });
  
  res.status(200).json({
    success: true,
    count: items.length,
    data: items
  });
});

// @desc    Get single canteen item
// @route   GET /api/v1/canteen/items/:id
// @access  Private (Admin)
export const getItemById = asyncHandler(async (req, res) => {
  const item = await CanteenItem.findById(req.params.id)
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email');
  
  if (!item) {
    return res.status(404).json({
      success: false,
      error: 'Item not found'
    });
  }
  
  res.status(200).json({
    success: true,
    data: item
  });
});

// @desc    Create new canteen item
// @route   POST /api/v1/canteen/items
// @access  Private (Admin)
export const createItem = asyncHandler(async (req, res) => {
  const { name, category, price, costPrice, stock, minStockLevel, unit, description } = req.body;
  
  // Check if item already exists
  const existingItem = await CanteenItem.findOne({ name });
  if (existingItem) {
    return res.status(400).json({
      success: false,
      error: 'Item with this name already exists'
    });
  }
  
  const item = await CanteenItem.create({
    name,
    category,
    price: parseFloat(price),
    costPrice: parseFloat(costPrice) || 0,
    stock: parseInt(stock) || 0,
    minStockLevel: parseInt(minStockLevel) || 10,
    unit: unit || 'piece',
    description,
    createdBy: req.user.id
  });
  
  res.status(201).json({
    success: true,
    data: item,
    message: 'Item created successfully'
  });
});

// @desc    Update canteen item
// @route   PUT /api/v1/canteen/items/:id
// @access  Private (Admin)
export const updateItem = asyncHandler(async (req, res) => {
  const item = await CanteenItem.findById(req.params.id);
  
  if (!item) {
    return res.status(404).json({
      success: false,
      error: 'Item not found'
    });
  }
  
  const updatedItem = await CanteenItem.findByIdAndUpdate(
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

// @desc    Delete canteen item
// @route   DELETE /api/v1/canteen/items/:id
// @access  Private (Admin)
export const deleteItem = asyncHandler(async (req, res) => {
  const item = await CanteenItem.findById(req.params.id);
  
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

// @desc    Update stock
// @route   PATCH /api/v1/canteen/items/:id/stock
// @access  Private (Admin)
export const updateStock = asyncHandler(async (req, res) => {
  const { quantity, type } = req.body;
  
  const item = await CanteenItem.findById(req.params.id);
  if (!item) {
    return res.status(404).json({
      success: false,
      error: 'Item not found'
    });
  }
  
  let newStock;
  switch (type) {
    case 'add':
      newStock = item.stock + parseInt(quantity);
      break;
    case 'remove':
      newStock = Math.max(0, item.stock - parseInt(quantity));
      break;
    case 'set':
      newStock = Math.max(0, parseInt(quantity));
      break;
    default:
      return res.status(400).json({
        success: false,
        error: 'Invalid stock update type'
      });
  }
  
  item.stock = newStock;
  await item.save();
  
  res.status(200).json({
    success: true,
    data: item,
    message: `Stock updated to ${newStock}`
  });
});

// ============ SALES MANAGEMENT ============

// @desc    Record a sale
// @route   POST /api/v1/canteen/sales
// @access  Private (Admin)
export const recordSale = asyncHandler(async (req, res) => {
  const { itemId, quantity, studentId, paymentMode, remarks } = req.body;
  
  // Get item details
  const item = await CanteenItem.findById(itemId);
  if (!item) {
    return res.status(404).json({
      success: false,
      error: 'Item not found'
    });
  }
  
  // Check stock
  if (item.stock < quantity) {
    return res.status(400).json({
      success: false,
      error: `Insufficient stock. Available: ${item.stock}`
    });
  }
  
  // Get student details if provided
  let studentDetails = {};
  if (studentId) {
    const student = await Student.findById(studentId);
    if (student) {
      studentDetails = {
        studentName: `${student.firstName} ${student.lastName}`,
        studentClass: student.currentClass,
        studentSection: student.section
      };
    }
  }
  
  // Calculate total amount
  const totalAmount = item.price * quantity;
  
  // Create sale record
  const sale = await CanteenSale.create({
    item: item._id,
    itemName: item.name,
    quantity,
    price: item.price,
    costPrice: item.costPrice || 0,
    totalAmount,
    student: studentId || null,
    ...studentDetails,
    paymentMode: paymentMode || 'Cash',
    soldBy: req.user.id,
    remarks
  });
  
  // Update stock
  item.stock -= quantity;
  await item.save();
  
  res.status(201).json({
    success: true,
    data: sale,
    message: `Sale recorded. Invoice: ${sale.invoiceNumber}`
  });
});

// @desc    Get today's sales
// @route   GET /api/v1/canteen/sales/today
// @access  Private (Admin)
export const getTodaySales = asyncHandler(async (req, res) => {
  const today = new Date();
  const startOfToday = new Date(today);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(today);
  endOfToday.setHours(23, 59, 59, 999);
  
  const sales = await CanteenSale.find({
    saleDate: { $gte: startOfToday, $lte: endOfToday }
  })
    .populate('item', 'name category costPrice')
    .populate('soldBy', 'name')
    .sort({ saleDate: -1 });
  
  const totalAmount = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const totalItems = sales.reduce((sum, sale) => sum + sale.quantity, 0);
  
  // Calculate profit
  const items = await CanteenItem.find();
  let totalCost = 0;
  sales.forEach(sale => {
    const item = items.find(i => i._id.toString() === sale.item?._id?.toString());
    const costPrice = item?.costPrice || 0;
    totalCost += costPrice * sale.quantity;
  });
  const totalProfit = totalAmount - totalCost;
  
  // Group by item
  const itemWise = {};
  sales.forEach(sale => {
    if (!itemWise[sale.itemName]) {
      itemWise[sale.itemName] = { quantity: 0, amount: 0, profit: 0 };
    }
    itemWise[sale.itemName].quantity += sale.quantity;
    itemWise[sale.itemName].amount += sale.totalAmount;
    
    const item = items.find(i => i._id.toString() === sale.item?._id?.toString());
    const costPrice = item?.costPrice || 0;
    itemWise[sale.itemName].profit += (sale.price - costPrice) * sale.quantity;
  });
  
  res.status(200).json({
    success: true,
    data: {
      date: format(today, 'yyyy-MM-dd'),
      totalAmount,
      totalItems,
      totalProfit,
      totalTransactions: sales.length,
      itemWise,
      sales
    }
  });
});

// @desc    Get sales report by date range
// @route   GET /api/v1/canteen/sales/report
// @access  Private (Admin)
export const getSalesReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, category } = req.query;
  
  let query = {};
  
  if (startDate && endDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    query.saleDate = {
      $gte: start,
      $lte: end
    };
  }
  
  const sales = await CanteenSale.find(query)
    .populate('item', 'name category costPrice')
    .populate('soldBy', 'name')
    .sort({ saleDate: -1 });
  
  // Apply category filter if specified
  let filteredSales = sales;
  if (category) {
    filteredSales = sales.filter(sale => sale.item?.category === category);
  }
  
  // Get all items for cost price lookup
  const items = await CanteenItem.find();
  
  const totalAmount = filteredSales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0);
  const totalItems = filteredSales.reduce((sum, sale) => sum + (sale.quantity || 0), 0);
  
  // Calculate total cost and profit
  let totalCost = 0;
  filteredSales.forEach(sale => {
    const item = items.find(i => i._id.toString() === sale.item?._id?.toString());
    const costPrice = item?.costPrice || sale.costPrice || 0;
    totalCost += costPrice * sale.quantity;
  });
  
  const totalProfit = totalAmount - totalCost;
  
  // Group by date
  const dailyData = {};
  filteredSales.forEach(sale => {
    const dateKey = format(new Date(sale.saleDate), 'yyyy-MM-dd');
    if (!dailyData[dateKey]) {
      dailyData[dateKey] = { 
        amount: 0, 
        cost: 0,
        profit: 0,
        items: 0, 
        transactions: 0 
      };
    }
    dailyData[dateKey].amount += sale.totalAmount;
    dailyData[dateKey].items += sale.quantity;
    dailyData[dateKey].transactions += 1;
    
    // Calculate cost for this sale
    const item = items.find(i => i._id.toString() === sale.item?._id?.toString());
    const costPrice = item?.costPrice || sale.costPrice || 0;
    dailyData[dateKey].cost += costPrice * sale.quantity;
    dailyData[dateKey].profit = dailyData[dateKey].amount - dailyData[dateKey].cost;
  });
  
  res.status(200).json({
    success: true,
    data: {
      period: { startDate, endDate },
      summary: {
        totalAmount,
        totalCost,
        totalProfit,
        totalItems,
        totalTransactions: filteredSales.length,
        averageTransaction: filteredSales.length > 0 ? totalAmount / filteredSales.length : 0
      },
      dailyData,
      sales: filteredSales.map(sale => ({
        _id: sale._id,
        invoiceNumber: sale.invoiceNumber,
        itemName: sale.itemName,
        quantity: sale.quantity,
        price: sale.price,
        totalAmount: sale.totalAmount,
        paymentMode: sale.paymentMode,
        saleDate: sale.saleDate,
        studentName: sale.studentName,
        remarks: sale.remarks
      }))
    }
  });
});

// ============ DASHBOARD STATS ============

// @desc    Get canteen dashboard stats
// @route   GET /api/v1/canteen/stats
// @access  Private (Admin)
export const getStats = asyncHandler(async (req, res) => {
  const today = new Date();
  const startOfToday = new Date(today);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(today);
  endOfToday.setHours(23, 59, 59, 999);
  
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  endOfMonth.setHours(23, 59, 59, 999);
  
  // Today's sales
  const todaySales = await CanteenSale.find({
    saleDate: { $gte: startOfToday, $lte: endOfToday }
  });
  
  const todayTotal = todaySales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0);
  const todayItemsSold = todaySales.reduce((sum, sale) => sum + (sale.quantity || 0), 0);
  
  // Month's sales
  const monthSales = await CanteenSale.find({
    saleDate: { $gte: startOfMonth, $lte: endOfMonth }
  });
  
  const monthTotal = monthSales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0);
  
  // Inventory stats
  const totalItems = await CanteenItem.countDocuments();
  const items = await CanteenItem.find();
  const lowStockItems = items.filter(item => item.stock <= item.minStockLevel).length;
  const outOfStock = items.filter(item => item.stock === 0).length;
  
  // Get categories
  const categories = await CanteenItem.distinct('category');
  
  // Calculate profit for today and month
  const todayProfit = todaySales.reduce((sum, sale) => {
    const item = items.find(i => i._id.toString() === sale.item.toString());
    const costPrice = item?.costPrice || 0;
    const profit = (sale.price - costPrice) * sale.quantity;
    return sum + profit;
  }, 0);
  
  const monthProfit = monthSales.reduce((sum, sale) => {
    const item = items.find(i => i._id.toString() === sale.item.toString());
    const costPrice = item?.costPrice || 0;
    const profit = (sale.price - costPrice) * sale.quantity;
    return sum + profit;
  }, 0);
  
  res.status(200).json({
    success: true,
    data: {
      today: {
        sales: todayTotal,
        itemsSold: todayItemsSold,
        transactions: todaySales.length,
        profit: todayProfit
      },
      month: {
        sales: monthTotal,
        transactions: monthSales.length,
        profit: monthProfit
      },
      inventory: {
        totalItems,
        lowStock: lowStockItems,
        outOfStock,
        categories: categories.length
      }
    }
  });
});

// @desc    Get categories
// @route   GET /api/v1/canteen/categories
// @access  Private (Admin)
export const getCategories = asyncHandler(async (req, res) => {
  const categories = await CanteenItem.distinct('category');
  
  res.status(200).json({
    success: true,
    data: categories
  });
});