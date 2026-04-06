// server/src/modules/inventory/models/InventoryTransaction.js

import mongoose from 'mongoose';

const inventoryTransactionSchema = new mongoose.Schema({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InventoryItem',
    required: true
  },
  itemName: {
    type: String,
    required: true
  },
  transactionType: {
    type: String,
    required: true,
    enum: ['IN', 'OUT', 'ADJUSTMENT', 'RETURN']
  },
  quantity: {
    type: Number,
    required: true
  },
  previousQuantity: {
    type: Number,
    required: true
  },
  newQuantity: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  issuedTo: {
    type: String,
    trim: true
  },
  issuedToStudent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  },
  issuedToTeacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  transactionDate: {
    type: Date,
    default: Date.now
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  remarks: String
}, {
  timestamps: true
});

// Indexes
inventoryTransactionSchema.index({ item: 1 });
inventoryTransactionSchema.index({ transactionDate: -1 });
inventoryTransactionSchema.index({ transactionType: 1 });

const InventoryTransaction = mongoose.model('InventoryTransaction', inventoryTransactionSchema);
export default InventoryTransaction;