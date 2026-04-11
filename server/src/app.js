// server/src/app.js
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import mongoose from 'mongoose';
import errorHandler from './middlewares/errorHandler.js';
import { protect, apiLimiter, loginLimiter } from './middlewares/auth.js';

import authRoutes from './modules/auth/routes/authRoutes.js';
import userRoutes from './modules/users/routes/userRoutes.js';
import studentRoutes from './modules/students/routes/studentRoutes.js';
import feeStructureRoutes from './modules/fees/routes/feeStructureRoutes.js';
import teacherRoutes from './modules/teachers/routes/teacherRoutes.js';
import attendanceRoutes from './modules/attendance/routes/attendanceRoutes.js';
import holidayRoutes from './modules/attendance/routes/holidayRoutes.js';
import examRoutes from './modules/exams/routes/examRoutes.js';
import feeRoutes from './modules/fees/routes/feeRoutes.js';
import paymentRoutes from './modules/payments/routes/paymentRoutes.js';
import canteenRoutes from './modules/canteen/routes/canteenRoutes.js';
import inventoryRoutes from './modules/inventory/routes/inventoryRoutes.js';
import siblingRoutes from './modules/siblings/routes/siblingRoutes.js';

const app = express();

// ========== CORS ==========
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://oxford-grammer-school-frontend.vercel.app',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.options('*', cors());

// ========== SECURITY ==========
app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
}));

// ========== BODY PARSING ==========
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(mongoSanitize());

// ========== RATE LIMITING ==========
// Must be BEFORE all route handlers so nothing bypasses it
app.use('/api', apiLimiter);

// ========== HEALTH & ROOT ==========
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Oxford Grammar School API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    dbState: mongoose.connection.readyState,
  });
});

// ========== DASHBOARD STATS ==========
app.get('/api/v1/students/stats/summary', protect, async (req, res) => {
  try {
    const Student = mongoose.model('Student');
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [total, active, newThisMonth, classWise] = await Promise.all([
      Student.countDocuments(),
      Student.countDocuments({ status: 'Active' }),
      Student.countDocuments({ createdAt: { $gte: monthStart, $lt: monthEnd } }),
      Student.aggregate([
        { $match: { status: 'Active' } },
        { $group: { _id: '$currentClass', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    // Sort class distribution in school order
    const classOrder = ['Play Group','Nursery','Prep','1','2','3','4','5','6','7','8','9','10'];
    const classDistribution = classOrder
      .map(cls => { const found = classWise.find(c => c._id === cls); return found ? { class: cls, count: found.count } : null; })
      .filter(Boolean);

    res.json({ success: true, data: { summary: { total, active, newThisMonth }, classDistribution } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/v1/teachers/stats', protect, async (req, res) => {
  try {
    const Teacher = mongoose.model('Teacher');
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [total, active, newThisMonth] = await Promise.all([
      Teacher.countDocuments(),
      Teacher.countDocuments({ status: 'Active' }),
      Teacher.countDocuments({ createdAt: { $gte: monthStart, $lt: monthEnd } }),
    ]);
    res.json({ success: true, data: { total, active, newThisMonth } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Activity log — pulls recent actions across students, teachers, payments, fees, attendance
app.get('/api/v1/dashboard/activity', protect, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const page  = parseInt(req.query.page)  || 1;
    const skip  = (page - 1) * limit;

    const Student    = mongoose.model('Student');
    const Teacher    = mongoose.model('Teacher');
    const Fee        = mongoose.model('Fee');
    const Payment    = mongoose.model('Payment');
    const Attendance = mongoose.model('Attendance');

    const [students, teachers, payments, fees, attendances] = await Promise.all([
      Student.find().select('firstName lastName admissionNo currentClass section createdAt updatedAt').sort({ createdAt: -1 }).limit(50).lean(),
      Teacher.find().select('firstName lastName createdAt').sort({ createdAt: -1 }).limit(30).lean(),
      Payment.find().select('studentName amount paymentMode paymentDate receiptNumber').sort({ paymentDate: -1 }).limit(50).lean(),
      Fee.find({ isGenerated: true }).select('studentName studentClass studentSection month academicYear createdAt').sort({ createdAt: -1 }).limit(50).lean(),
      Attendance.find({ approvalStatus: 'Approved' }).select('class section date approvalStatus createdAt').sort({ createdAt: -1 }).limit(30).lean(),
    ]);

    const activities = [];

    students.forEach(s => {
      activities.push({
        type: 'admission',
        action: `New student admitted: ${s.firstName} ${s.lastName || ''} (${s.admissionNo}) — Class ${s.currentClass}-${s.section}`,
        time: s.createdAt,
        link: '/admin/students',
      });
    });

    teachers.forEach(t => {
      activities.push({
        type: 'teacher',
        action: `New teacher added: ${t.firstName} ${t.lastName || ''}`,
        time: t.createdAt,
        link: '/admin/teachers',
      });
    });

    payments.forEach(p => {
      activities.push({
        type: 'payment',
        action: `Fee payment received: Rs. ${(p.amount || 0).toLocaleString('en-PK')} from ${p.studentName || 'Student'} (${p.paymentMode || 'Cash'})`,
        time: p.paymentDate,
        link: '/admin/payments',
      });
    });

    fees.forEach(f => {
      activities.push({
        type: 'fee',
        action: `Fee generated for ${f.studentName || 'Student'} — Class ${f.studentClass || ''} — ${f.month} ${f.academicYear}`,
        time: f.createdAt,
        link: '/admin/fees',
      });
    });

    attendances.forEach(a => {
      activities.push({
        type: 'attendance',
        action: `Attendance approved — Class ${a.class}-${a.section}`,
        time: a.createdAt,
        link: '/admin/attendance',
      });
    });

    // Sort all by time descending
    activities.sort((a, b) => new Date(b.time) - new Date(a.time));

    const total = activities.length;
    const paginated = activities.slice(skip, skip + limit);

    res.json({
      success: true,
      total,
      page,
      hasMore: skip + limit < total,
      data: paginated.map(a => ({
        ...a,
        timeFormatted: a.time ? new Date(a.time).toLocaleString('en-PK', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '',
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/v1/attendance/stats', protect, async (req, res) => {
  try {
    const Attendance = mongoose.model('Attendance');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayAttendance = await Attendance.find({
      date: { $gte: today, $lt: new Date(today.getTime() + 86400000) },
      approvalStatus: 'Approved',
    });
    const present = todayAttendance.filter((a) => a.status === 'Present').length;
    const absent  = todayAttendance.filter((a) => a.status === 'Absent').length;
    const leave   = todayAttendance.filter((a) => a.status === 'Leave').length;
    const total   = present + absent + leave;
    res.json({
      success: true,
      data: {
        today: {
          percentage: total > 0 ? Math.round((present / total) * 100) : 0,
          present, absent, leave,
        },
        month: { percentage: 0 },
      },
    });
  } catch (error) {
    res.json({
      success: true,
      data: { today: { percentage: 0, present: 0, absent: 0, leave: 0 }, month: { percentage: 0 } },
    });
  }
});

app.get('/api/v1/fees/stats/summary', protect, async (req, res) => {
  try {
    const Fee = mongoose.model('Fee');
    const result = await Fee.aggregate([
      { $group: { _id: null, totalPaid: { $sum: '$paidAmount' }, totalDue: { $sum: '$dueAmount' } } },
    ]);
    const totalPaid = result[0]?.totalPaid || 0;
    const totalDue  = result[0]?.totalDue  || 0;
    res.json({
      success: true,
      data: {
        totalPaid,
        totalDue,
        collectionRate: totalPaid > 0
          ? ((totalPaid / (totalPaid + totalDue)) * 100).toFixed(2)
          : 0,
      },
    });
  } catch (error) {
    res.json({ success: true, data: { totalPaid: 0, totalDue: 0, collectionRate: 0 } });
  }
});

// ========== API ROUTES ==========
// loginLimiter applied only to auth routes (stricter: 10 attempts per 15 min)
app.use('/api/v1/auth', loginLimiter, authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/students', studentRoutes);
app.use('/api/v1/fee-structure', feeStructureRoutes);
app.use('/api/v1/teachers', teacherRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/holidays', holidayRoutes);
app.use('/api/v1/exams', examRoutes);
app.use('/api/v1/fees', feeRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/canteen', canteenRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/siblings', siblingRoutes);

// ========== 404 ==========
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `API endpoint not found: ${req.method} ${req.path}`,
  });
});

app.use(errorHandler);

export default app;