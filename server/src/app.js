import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser
app.use(cookieParser());

// ========== CORS CONFIGURATION - FINAL WORKING VERSION ==========
// Handle preflight requests for all routes FIRST
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  if (origin && (origin.includes('localhost') || origin.includes('vercel.app'))) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.sendStatus(200);
});

// CORS middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (origin.includes('localhost') || origin.includes('vercel.app'))) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Security headers (relaxed for Vercel)
app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
}));

// Sanitize data
app.use(mongoSanitize());

// Root route for testing
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Oxford Grammar School API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      health: '/health',
      auth: '/api/v1/auth/login',
      students: '/api/v1/students'
    }
  });
});

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
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `API endpoint not found: ${req.method} ${req.path}`
  });
});

// Error handler (should be last)
app.use(errorHandler);

export default app;