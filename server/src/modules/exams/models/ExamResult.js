import mongoose from 'mongoose';

const examResultSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true
  },
  class: {
    type: String,
    required: true
  },
  section: String,
  subjectResults: [{
    subjectName: String,
    marksObtained: Number,
    totalMarks: Number,
    grade: String,
    remarks: String
  }],
  totalMarksObtained: Number,
  totalMarks: Number,
  percentage: Number,
  grade: {
    type: String,
    enum: ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F']
  },
  rank: Number,
  positionInClass: Number,
  result: {
    type: String,
    enum: ['Pass', 'Fail', 'Promoted', 'Failed'],
    default: 'Fail'
  },
  remarks: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

// Index for faster queries
examResultSchema.index({ student: 1, exam: 1 }, { unique: true });

const ExamResult = mongoose.model('ExamResult', examResultSchema);
export default ExamResult;