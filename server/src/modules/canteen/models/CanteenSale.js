// server/src/modules/canteen/models/CanteenSale.js

import mongoose from 'mongoose';

const canteenSaleSchema = new mongoose.Schema({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CanteenItem',
    required: true
  },
  itemName: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true
  },
  costPrice: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  },
  studentName: String,
  studentClass: String,
  studentSection: String,
  paymentMode: {
    type: String,
    enum: ['Cash', 'Student Card', 'Parent Account'],
    default: 'Cash'
  },
  saleDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  soldBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  remarks: String,
  invoiceNumber: {
    type: String,
    unique: true
  }
}, {
  timestamps: true
});

// Generate invoice number before saving
canteenSaleSchema.pre('save', async function(next) {
  if (!this.invoiceNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const count = await mongoose.model('CanteenSale').countDocuments();
    this.invoiceNumber = `CANT-${year}${month}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Indexes
canteenSaleSchema.index({ saleDate: -1 });
canteenSaleSchema.index({ student: 1 });
canteenSaleSchema.index({ item: 1 });
canteenSaleSchema.index({ invoiceNumber: 1 });

const CanteenSale = mongoose.model('CanteenSale', canteenSaleSchema);
export default CanteenSale;