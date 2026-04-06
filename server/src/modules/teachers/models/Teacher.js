
import mongoose from 'mongoose';

const teacherSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
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
  dateOfBirth: {
    type: Date,
    required: true
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
    required: true
  },
  cnic: {
    type: String,
    unique: true,
    trim: true
  },
  qualification: {
    type: String,
    required: [true, 'Qualification is required'],
    trim: true
  },
  specialization: {
    type: String,
    required: [true, 'Specialization is required'],
    trim: true
  },
  experience: {
    type: Number, // in years
    required: true,
    min: 0
  },
  
  // Contact Information
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  emergencyPhone: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
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
  
  // Employment Details
  joiningDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  designation: {
    type: String,
    enum: ['Head Teacher', 'Senior Teacher', 'Teacher', 'Assistant Teacher'],
    default: 'Teacher'
  },
  salary: {
    type: Number,
    required: true,
    min: 0
  },
  bankAccount: {
    accountNumber: String,
    accountTitle: String,
    bankName: String,
    iban: String
  },
  
  // Class & Subject Assignments
  assignedClasses: [{
    class: {
      type: String,
      enum: ['Play Group', 'Nursery', 'Prep', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
    },
    section: {
      type: String,
      enum: ['A', 'B', 'C', 'D']
    },
    subject: String
  }],
  
  subjects: [{
    type: String,
    trim: true
  }],
  
  // Documents
  documents: [{
    documentType: String,
    documentUrl: String,
    uploadedAt: Date
  }],
  
  // Status
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'On Leave', 'Terminated'],
    default: 'Active'
  },
  leaveDate: Date,
  leaveReason: String,
  
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

// Virtual for full name
teacherSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName || ''}`.trim();
});

// Virtual for age
teacherSchema.virtual('age').get(function() {
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

// Pre-save middleware to generate employeeId
teacherSchema.pre('save', async function(next) {
  if (!this.isNew) return next();
  
  try {
    // Generate employee ID: OGS-YYYY-XXX
    const currentYear = new Date().getFullYear();
    const lastTeacher = await this.constructor.findOne().sort({ employeeId: -1 });
    
    if (lastTeacher && lastTeacher.employeeId) {
      const lastNumber = parseInt(lastTeacher.employeeId.split('-')[2]) || 0;
      this.employeeId = `OGS-${currentYear}-${String(lastNumber + 1).padStart(3, '0')}`;
    } else {
      this.employeeId = `OGS-${currentYear}-001`;
    }
    next();
  } catch (error) {
    next(error);
  }
});

const Teacher = mongoose.model('Teacher', teacherSchema);
export default Teacher;
