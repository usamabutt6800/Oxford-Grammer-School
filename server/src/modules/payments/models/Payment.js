// server/src/modules/payments/models/Payment.js

import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  fee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fee',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  // ========== EMBEDDED STUDENT DETAILS (Like attendance!) ==========
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
  month: {
    type: String,
    trim: true
  },
  academicYear: {
    type: String,
    trim: true
  },
  // ========== End of embedded fields ==========
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  paymentMode: {
    type: String,
    enum: ['Cash', 'Bank Transfer', 'Cheque', 'Online', 'EasyPaisa', 'JazzCash', 'Other'],
    default: 'Cash',
    required: true
  },
  transactionId: String,
  receiptNumber: {
    type: String,
    unique: true
  },
  bankName: String,
  chequeNo: String,
  remarks: String,
  receivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isVerified: {
    type: Boolean,
    default: true
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verificationDate: Date
}, {
  timestamps: true
});

// ========== PRE-SAVE MIDDLEWARE - Populate embedded student fields (Like attendance!) ==========
paymentSchema.pre('save', async function(next) {
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
        console.log(`✅ Payment pre-save: Populated student details for ${this.studentName}`);
      }
    } catch (error) {
      console.error('Error in payment pre-save middleware:', error);
    }
  }
  next();
});

// Indexes for faster queries
paymentSchema.index({ student: 1, paymentDate: -1 });
paymentSchema.index({ receiptNumber: 1 });
paymentSchema.index({ studentName: 1 }); // For searching by name
paymentSchema.index({ admissionNo: 1 }); // For searching by admission number

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;