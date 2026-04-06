import mongoose from 'mongoose';

const examSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    enum: ['1st Term', '2nd Term', 'Final']
  },
  academicYear: {
    type: String,
    required: true,
    default: () => {
      const currentYear = new Date().getFullYear();
      return `${currentYear}-${currentYear + 1}`;
    }
  },
  class: {
    type: String,
    required: true,
    enum: ['Play Group', 'Nursery', 'Prep', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
  },
  subjects: [{
    subjectName: {
      type: String,
      required: true
    },
    totalMarks: {
      type: Number,
      required: true,
      default: 100
    },
    passMarks: {
      type: Number,
      required: true,
      default: 40
    },
    examDate: Date,
    examTime: String,
    roomNumber: String
  }],
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  totalMarks: Number,
  passPercentage: {
    type: Number,
    default: 40
  },
  status: {
    type: String,
    enum: ['Upcoming', 'Ongoing', 'Completed', 'Cancelled'],
    default: 'Upcoming'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

const Exam = mongoose.model('Exam', examSchema);
export default Exam;