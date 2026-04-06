// server/src/modules/inventory/models/InventoryItem.js

import mongoose from 'mongoose';

const inventoryItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true,
    unique: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['Stationery', 'Furniture', 'Electronics', 'Lab Equipment', 'Sports', 'Uniform', 'Books', 'Other'],
    default: 'Other'
  },
  subCategory: {
    type: String,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  minQuantity: {
    type: Number,
    default: 10,
    min: 0
  },
  maxQuantity: {
    type: Number,
    default: 1000
  },
  unit: {
    type: String,
    default: 'piece',
    enum: ['piece', 'set', 'box', 'packet', 'kg', 'liter']
  },
  location: {
    type: String,
    trim: true,
    default: 'Store Room'
  },
  rackNo: String,
  shelfNo: String,
  purchasePrice: {
    type: Number,
    default: 0,
    min: 0
  },
  sellingPrice: {
    type: Number,
    default: 0,
    min: 0
  },
  supplier: {
    type: String,
    trim: true
  },
  supplierContact: String,
  lastOrderDate: Date,
  lastOrderQuantity: Number,
  description: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Damaged', 'Disposed'],
    default: 'Active'
  },
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
inventoryItemSchema.index({ name: 1 });
inventoryItemSchema.index({ category: 1 });
inventoryItemSchema.index({ location: 1 });
inventoryItemSchema.index({ status: 1 });

// Virtual for stock status
inventoryItemSchema.virtual('stockStatus').get(function() {
  if (this.quantity <= 0) return 'Out of Stock';
  if (this.quantity <= this.minQuantity) return 'Low Stock';
  if (this.quantity >= this.maxQuantity) return 'Excess Stock';
  return 'In Stock';
});

const InventoryItem = mongoose.model('InventoryItem', inventoryItemSchema);
export default InventoryItem;