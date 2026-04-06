
import mongoose from 'mongoose';

const classLevels = ['Play Group', 'Nursery', 'Prep', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

const feeStructureSchema = new mongoose.Schema({
  class: {
    type: String,
    enum: classLevels,
    required: true,
    unique: true
  },
  tuitionFee: {
    type: Number,
    required: true,
    min: 0
  },
  admissionFee: {
    type: Number,
    default: 0,
    min: 0
  },
  examFee: {
    type: Number,
    default: 0,
    min: 0
  },
  otherCharges: {
    type: Number,
    default: 0,
    min: 0
  },
  academicYear: {
    type: String,
    required: true,
    default: () => {
      const currentYear = new Date().getFullYear();
      return `${currentYear}-${currentYear + 1}`;
    }
  },
  description: {
    type: String,
    trim: true
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

// Virtual for total fee
feeStructureSchema.virtual('totalFee').get(function() {
  return this.tuitionFee + this.admissionFee + this.examFee + this.otherCharges;
});

const FeeStructure = mongoose.model('FeeStructure', feeStructureSchema);
export default FeeStructure;
