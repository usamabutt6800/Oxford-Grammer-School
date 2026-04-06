// server/src/modules/canteen/models/CanteenItem.js

import mongoose from 'mongoose';

const canteenItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true,
    unique: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['Fast Food', 'Beverages', 'Snacks', 'Desserts', 'Lunch', 'Breakfast'],
    default: 'Snacks'
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  costPrice: {
    type: Number,
    default: 0,
    min: 0
  },
  stock: {
    type: Number,
    default: 0,
    min: 0
  },
  minStockLevel: {
    type: Number,
    default: 10,
    min: 0
  },
  unit: {
    type: String,
    default: 'piece',
    enum: ['piece', 'plate', 'bottle', 'cup', 'packet']
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  description: {
    type: String,
    trim: true
  },
  imageUrl: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
canteenItemSchema.index({ name: 1 });
canteenItemSchema.index({ category: 1 });
canteenItemSchema.index({ isAvailable: 1 });

// Virtual for stock status
canteenItemSchema.virtual('stockStatus').get(function() {
  if (this.stock <= 0) return 'Out of Stock';
  if (this.stock <= this.minStockLevel) return 'Low Stock';
  return 'In Stock';
});

const CanteenItem = mongoose.model('CanteenItem', canteenItemSchema);
export default CanteenItem;