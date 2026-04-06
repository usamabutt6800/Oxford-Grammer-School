import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    index: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  // ADD THESE TWO FIELDS BACK:
  studentName: {
    type: String,
    trim: true
  },
  rollNo: {
    type: String,
    trim: true
  },
  class: {
    type: String,
    required: true,
    enum: ['Play Group', 'Nursery', 'Prep', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
  },
  section: {
    type: String,
    required: true,
    enum: ['A', 'B', 'C', 'D']
  },
  status: {
    type: String,
    required: true,
    enum: ['Present', 'Absent', 'Leave'],
    default: 'Present'
  },
  approvalStatus: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  remarks: {
    type: String,
    trim: true,
    maxlength: 500
  },
  markedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  isTeacherMarked: {
    type: Boolean,
    default: false
  },
  isHoliday: {
    type: Boolean,
    default: false
  },
  holidayReason: {
    type: String,
    trim: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate attendance for same student on same date
attendanceSchema.index({ date: 1, student: 1 }, { unique: true });

// Index for approval status to improve query performance
attendanceSchema.index({ approvalStatus: 1 });
attendanceSchema.index({ isTeacherMarked: 1 });

// Virtual for class-section
attendanceSchema.virtual('classSection').get(function() {
  return `${this.class}-${this.section}`;
});

// ADD THIS NEW PRE-SAVE MIDDLEWARE TO AUTO-POPULATE STUDENT DETAILS
attendanceSchema.pre('save', async function(next) {
  try {
    // Only populate studentName and rollNo if they're missing but we have student reference
    if ((!this.studentName || !this.rollNo) && this.student) {
      const Student = mongoose.model('Student');
      const student = await Student.findById(this.student).select('firstName lastName rollNo currentClass section');
      
      if (student) {
        if (!this.studentName) {
          this.studentName = `${student.firstName} ${student.lastName || ''}`.trim();
        }
        if (!this.rollNo) {
          this.rollNo = student.rollNo;
        }
        if (!this.class) {
          this.class = student.currentClass;
        }
        if (!this.section) {
          this.section = student.section;
        }
      }
    }
    
    // Update approvedAt timestamp when approvalStatus changes to 'Approved'
    if (this.isModified('approvalStatus') && this.approvalStatus === 'Approved' && !this.approvedAt) {
      this.approvedAt = new Date();
    }
    
    next();
  } catch (error) {
    console.error('Error in attendance pre-save middleware:', error);
    next(error);
  }
});

const Attendance = mongoose.model('Attendance', attendanceSchema);
export default Attendance;