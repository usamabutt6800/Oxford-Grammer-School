import mongoose from 'mongoose';

const classSchema = new mongoose.Schema({
  className: {
    type: String,
    required: true,
    enum: ['Play Group', 'Nursery', 'Prep', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
  },
  section: {
    type: String,
    required: true,
    enum: ['A', 'B', 'C', 'D']
  },
  roomNo: String,
  capacity: {
    type: Number,
    default: 30
  },
  currentStrength: {
    type: Number,
    default: 0
  },
  classTeacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  subjects: [{
    subjectName: String,
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  feeStructure: {
    tuitionFee: Number,
    admissionFee: Number,
    examFee: Number,
    otherCharges: Number
  },
  timetable: [{
    day: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    },
    periods: [{
      time: String,
      subject: String,
      teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }]
  }],
  academicYear: {
    type: String,
    default: new Date().getFullYear().toString()
  }
}, {
  timestamps: true
});

// Virtual for full class name
classSchema.virtual('fullClassName').get(function() {
  return `Class ${this.className} - Section ${this.section}`;
});

const Class = mongoose.model('Class', classSchema);
export default Class;