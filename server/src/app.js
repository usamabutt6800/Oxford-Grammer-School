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
    const [total, active, newThisMonth] = await Promise.all([
      Student.countDocuments(),
      Student.countDocuments({ status: 'Active' }),
      Student.countDocuments({
        createdAt: {
          $gte: new Date(now.getFullYear(), now.getMonth(), 1),
          $lt: new Date(now.getFullYear(), now.getMonth() + 1, 1),
        },
      }),
    ]);
    res.json({ success: true, data: { summary: { total, active, newThisMonth } } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/v1/teachers/stats', protect, async (req, res) => {
  try {
    const Teacher = mongoose.model('Teacher');
    const [total, active] = await Promise.all([
      Teacher.countDocuments(),
      Teacher.countDocuments({ status: 'Active' }),
    ]);
    res.json({ success: true, data: { total, active, newThisMonth: 0 } });
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

// ========== 404 ==========
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `API endpoint not found: ${req.method} ${req.path}`,
  });
});

app.use(errorHandler);

export default app;