import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import errorHandler from './middlewares/errorHandler.js';
import { apiLimiter } from './middlewares/auth.js';

// Import routes
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

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parser
app.use(cookieParser());

// Enable CORS - Allow all origins in development
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Set security headers
app.use(helmet({
  crossOriginResourcePolicy: false, // Allow images and resources from other domains
}));

// Sanitize data
app.use(mongoSanitize());

// Rate limiting for API
app.use('/api', apiLimiter);

// API routes
app.use('/api/v1/auth', authRoutes);
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Oxford Grammar School API is running',
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

export default app;