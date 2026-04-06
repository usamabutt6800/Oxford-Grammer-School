// server/src/modules/fees/models/Fee.js

import mongoose from 'mongoose';

// Fee Generation Log Schema - Tracks monthly fee generation
const feeGenerationLogSchema = new mongoose.Schema({
  class: {
    type: String,
    required: true
  },
  section: {
    type: String,
    default: 'All'
  },
  month: {
    type: String,
    required: true
  },
  academicYear: {
    type: String,
    required: true
  },
  generatedAt: {
    type: Date,
    default: Date.now
  },
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  totalStudents: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Compound index to ensure one generation per class/section/month/year
feeGenerationLogSchema.index({ class: 1, section: 1, month: 1, academicYear: 1 }, { unique: true });

// Fee Schema - ADDED EMBEDDED STUDENT FIELDS (like attendance)
const feeSchema = new mongoose.Schema({
  // Reference to student (for relationships)
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  // ========== EMBEDDED STUDENT DETAILS (Like Attendance does!) ==========
  studentName: {
    type: String,
    trim: true
  },
  admissionNo: {
    type: String,
    trim: true
  },
  studentClass: {
    type: String,
    trim: true
  },
  studentSection: {
    type: String,
    trim: true
  },
  fatherName: {
    type: String,
    trim: true
  },
  // ========== End of embedded fields ==========
  academicYear: {
    type: String,
    required: true
  },
  month: {
    type: String,
    required: true,
    enum: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  },
  feeItems: [{
    itemName: {
      type: String,
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    isRecurring: {
      type: Boolean,
      default: false
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    addedBy: {
      type: String,
      default: 'System'
    },
    description: {
      type: String,
      default: ''
    }
  }],
  totalAmount: {
    type: Number,
    required: true
  },
  discount: {
    type: Number,
    default: 0
  },
  netAmount: {
    type: Number,
    required: true
  },
  paidAmount: {
    type: Number,
    default: 0
  },
  dueAmount: {
    type: Number,
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Partially Paid', 'Paid', 'Overdue', 'Cancelled'],
    default: 'Pending'
  },
  paymentHistory: [{
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment'
    },
    amount: {
      type: Number,
      required: true
    },
    date: {
      type: Date,
      default: Date.now
    },
    paymentMode: {
      type: String,
      enum: ['Cash', 'Bank Transfer', 'Cheque', 'Online', 'Other'],
      default: 'Cash'
    },
    transactionId: String,
    receiptNumber: String,
    remarks: String,
    paidBy: String,
    paymentFor: {
      month: String,
      year: String,
      description: String
    }
  }],
  // Track monthly fees separately
  monthlyFees: [{
    month: String,
    year: String,
    tuitionFee: Number,
    discount: Number,
    netAmount: Number,
    dueDate: Date,
    paidAmount: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['Pending', 'Partially Paid', 'Paid', 'Overdue'],
      default: 'Pending'
    },
    additionalCharges: [{
      itemName: String,
      amount: Number,
      date: Date,
      description: String
    }],
    payments: [{
      amount: Number,
      date: Date,
      paymentMode: String
    }]
  }],
  remarks: {
    type: String,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isGenerated: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// ========== PRE-SAVE MIDDLEWARE - Populate embedded student fields (Like attendance!) ==========
feeSchema.pre('save', async function(next) {
  // Populate embedded student fields if they're missing
  if ((!this.studentName || !this.admissionNo) && this.student) {
    try {
      const Student = mongoose.model('Student');
      const student = await Student.findById(this.student).select('firstName lastName admissionNo currentClass section fatherName');
      
      if (student) {
        if (!this.studentName) {
          this.studentName = `${student.firstName} ${student.lastName || ''}`.trim();
        }
        if (!this.admissionNo) {
          this.admissionNo = student.admissionNo;
        }
        if (!this.studentClass) {
          this.studentClass = student.currentClass;
        }
        if (!this.studentSection) {
          this.studentSection = student.section;
        }
        if (!this.fatherName) {
          this.fatherName = student.fatherName;
        }
        console.log(`✅ Fee pre-save: Populated student details for ${this.studentName}`);
      }
    } catch (error) {
      console.error('Error in fee pre-save middleware:', error);
    }
  }
  
  // Calculate due amount
  this.dueAmount = this.netAmount - this.paidAmount;
  
  // Update status based on payment and due date
  const currentDate = new Date();
  
  if (this.paidAmount >= this.netAmount) {
    this.status = 'Paid';
  } else if (this.paidAmount > 0) {
    this.status = 'Partially Paid';
  } else if (currentDate > this.dueDate && this.dueAmount > 0) {
    this.status = 'Overdue';
  } else {
    this.status = 'Pending';
  }
  
  next();
});

// Auto-populate student field with name fields for all find queries
feeSchema.pre('find', function() {
  this.populate('student', 'firstName lastName admissionNo currentClass section rollNo fatherName motherName phone email feeStructure');
});

feeSchema.pre('findOne', function() {
  this.populate('student', 'firstName lastName admissionNo currentClass section rollNo fatherName motherName phone email feeStructure');
});

// ========== VIRTUAL FIELDS ==========

// Virtual for student full name (for population fallback)
feeSchema.virtual('studentNameVirtual').get(function() {
  if (this.student && typeof this.student === 'object') {
    if (this.student.firstName) {
      return `${this.student.firstName} ${this.student.lastName || ''}`.trim();
    }
  }
  return this.studentName || 'Unknown';
});

// Virtual for late fee calculation
feeSchema.virtual('lateFee').get(function() {
  const currentDate = new Date();
  if (currentDate > this.dueDate && this.status !== 'Paid' && this.status !== 'Cancelled') {
    const daysLate = Math.floor((currentDate - this.dueDate) / (1000 * 60 * 60 * 24));
    const lateFeePercentage = Math.min(daysLate / 30 * 0.02, 0.10);
    return Math.round(this.netAmount * lateFeePercentage);
  }
  return 0;
});

// ========== INDEXES ==========

// Add index for better query performance
feeSchema.index({ student: 1, academicYear: 1, month: 1 });
feeSchema.index({ status: 1 });
feeSchema.index({ dueDate: 1 });
feeSchema.index({ studentName: 1 }); // For searching by name
feeSchema.index({ admissionNo: 1 }); // For searching by admission number

// Compound index for class and academic year
feeSchema.index({ studentClass: 1, academicYear: 1 });

// ========== INSTANCE METHODS ==========

// Method to add payment
feeSchema.methods.addPayment = async function(paymentData) {
  this.paidAmount += paymentData.amount;
  this.paymentHistory.push({
    paymentId: paymentData.paymentId,
    amount: paymentData.amount,
    date: paymentData.date || new Date(),
    paymentMode: paymentData.paymentMode,
    transactionId: paymentData.transactionId,
    receiptNumber: paymentData.receiptNumber,
    remarks: paymentData.remarks,
    paidBy: paymentData.paidBy,
    paymentFor: paymentData.paymentFor || {
      month: this.month,
      year: this.academicYear,
      description: `Fee for ${this.month} ${this.academicYear}`
    }
  });
  
  // Update due amount and status
  this.dueAmount = this.netAmount - this.paidAmount;
  
  if (this.paidAmount >= this.netAmount) {
    this.status = 'Paid';
  } else if (this.paidAmount > 0) {
    this.status = 'Partially Paid';
  }
  
  return await this.save();
};

// Method to add a fee item
feeSchema.methods.addFeeItem = async function(itemData) {
  this.feeItems.push({
    itemName: itemData.itemName,
    amount: itemData.amount,
    isRecurring: itemData.isRecurring || false,
    addedAt: new Date(),
    addedBy: itemData.addedBy || 'System',
    description: itemData.description || ''
  });
  
  // Recalculate totals
  this.totalAmount = this.feeItems.reduce((sum, item) => sum + item.amount, 0);
  this.netAmount = this.totalAmount - this.discount;
  this.dueAmount = this.netAmount - this.paidAmount;
  
  return await this.save();
};

// ========== STATIC METHODS ==========

// Static method to get fees with populated student names
feeSchema.statics.getFeesWithStudentNames = async function(query = {}) {
  return await this.find(query)
    .populate({
      path: 'student',
      select: 'firstName lastName admissionNo currentClass section rollNo fatherName motherName phone email feeStructure'
    })
    .lean();
};

const Fee = mongoose.model('Fee', feeSchema);
const FeeGenerationLog = mongoose.model('FeeGenerationLog', feeGenerationLogSchema);

export default Fee;
export { FeeGenerationLog };