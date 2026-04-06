import mongoose from 'mongoose';

const classLevels = ['Play Group', 'Nursery', 'Prep', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

const examResultSchema = new mongoose.Schema({
  examType: {
    type: String,
    enum: ['1st Term', '2nd Term', 'Final'],
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  subjects: [{
    subjectName: String,
    marks: Number,
    totalMarks: Number,
    grade: String
  }],
  totalMarks: Number,
  obtainedMarks: Number,
  percentage: Number,
  rank: Number,
  result: {
    type: String,
    enum: ['Pass', 'Fail', 'Promoted'],
    default: 'Fail'
  },
  remarks: String
}, { timestamps: true });

const studentSchema = new mongoose.Schema({
  admissionNo: {
    type: String,
    required: true,
    unique: true
  },
  rollNo: {
    type: String,
    required: true
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: {
    type: String,
    trim: true
  },
  fatherName: {
    type: String,
    required: [true, "Father's name is required"],
    trim: true
  },
  motherName: {
    type: String,
    trim: true
  },
  dateOfBirth: {
    type: Date,
    required: true
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
    required: true
  },
  bloodGroup: String,
  currentClass: {
    type: String,
    enum: classLevels,
    required: true
  },
  section: {
    type: String,
    enum: ['A', 'B', 'C', 'D'],
    default: 'A'
  },
  admissionDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  // CONTACT FIELDS - MAKE THEM FLAT
  phone: {
    type: String,
    trim: true
  },
  fatherPhone: {
    type: String,
    trim: true
  },
  motherPhone: {
    type: String,
    trim: true
  },
  emergencyPhone: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  
  address: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: {
      type: String,
      default: 'Pakistan'
    }
  },
  
  // Exam & Academic Records
  examResults: [examResultSchema],
  lastPromotionDate: Date,
  promotionHistory: [{
    fromClass: String,
    toClass: String,
    date: Date,
    promotedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  // Fee Information
  feeStructure: {
    tuitionFee: {
      type: Number,
      required: true,
      default: 5000
    },
    admissionFee: Number,
    examFee: Number,
    otherCharges: Number,
    discountType: {
      type: String,
      enum: ['None', 'Orphan', 'Sibling', 'Special', 'Custom'],
      default: 'None'
    },
    discountPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    totalFee: Number,
    netFee: Number
  },
  
  // Attendance Summary
  attendanceSummary: {
    totalDays: { type: Number, default: 0 },
    presentDays: { type: Number, default: 0 },
    absentDays: { type: Number, default: 0 },
    leaveDays: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 }
  },
  
  // Status
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Graduated', 'Transferred'],
    default: 'Active'
  },
  leaveDate: Date,
  leaveReason: String,
  
  documents: [{
    documentType: String,
    documentUrl: String,
    uploadedAt: Date
  }],
  
  remarks: String,
  
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

// ... rest of the model remains the same ...

// Virtual for full name
studentSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName || ''}`.trim();
});

// Calculate age
studentSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

// Pre-save middleware to calculate net fee based on discount
studentSchema.pre('save', function(next) {
  if (this.isModified('feeStructure')) {
    const fee = this.feeStructure;
    const total = (fee.tuitionFee || 0) + (fee.admissionFee || 0) + 
                  (fee.examFee || 0) + (fee.otherCharges || 0);
    
    fee.totalFee = total;
    
    // Apply discount
    let discount = 0;
    if (fee.discountType === 'Orphan') {
      discount = 50; // 50% discount for orphans
    } else if (fee.discountType === 'Sibling') {
      discount = 20; // 20% discount for siblings
    } else if (fee.discountType === 'Custom') {
      discount = fee.discountPercentage || 0;
    }
    
    discount = Math.min(discount, 100);
    fee.discountPercentage = discount;
    fee.netFee = total - (total * discount / 100);
  }
  next();
});

// Method to promote student
studentSchema.methods.promoteToNextClass = function(adminId) {
  const currentIndex = classLevels.indexOf(this.currentClass);
  if (currentIndex < classLevels.length - 1) {
    const oldClass = this.currentClass;
    this.currentClass = classLevels[currentIndex + 1];
    this.promotionHistory.push({
      fromClass: oldClass,
      toClass: this.currentClass,
      date: new Date(),
      promotedBy: adminId
    });
    this.lastPromotionDate = new Date();
    
    // Update roll number format: Class-Section-Sequence (e.g., 1-A-01)
    const classNum = this.currentClass.replace(/\D/g, '') || this.currentClass;
    this.rollNo = `${classNum}-${this.section}-${this.admissionNo.slice(-2)}`;
    
    return true;
  }
  return false; // Already in highest class
};

// Static method for bulk promotion
studentSchema.statics.promoteStudents = async function(studentIds, adminId) {
  const students = await this.find({ _id: { $in: studentIds }, status: 'Active' });
  
  const results = {
    promoted: [],
    failed: [],
    alreadyHighest: []
  };
  
  for (const student of students) {
    if (student.promoteToNextClass(adminId)) {
      await student.save();
      results.promoted.push(student._id);
    } else {
      results.alreadyHighest.push(student._id);
    }
  }
  
  return results;
};

const Student = mongoose.model('Student', studentSchema);
export default Student;