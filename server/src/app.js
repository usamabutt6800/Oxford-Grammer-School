import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import errorHandler from './middlewares/errorHandler.js';
import { apiLimiter } from './middlewares/auth.js';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Enable CORS - Allow both localhost and production domains
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://oxford-school.vercel.app',
  'https://oxford-school-frontend.vercel.app',
  'https://oxford-school-git-main.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(null, true); // Still allow for now, but log it
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Set security headers (relaxed for production)
app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
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
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ========== SERVE STATIC FILES IN PRODUCTION ==========
// This is for when backend serves frontend (optional)
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '../../client/dist');
  console.log('Serving frontend from:', frontendPath);
  
  // Serve static files
  app.use(express.static(frontendPath));
  
  // Handle React routing - return all requests to React app
  app.get('*', (req, res) => {
    // Skip API routes that weren't caught
    if (req.path.startsWith('/api')) {
      return res.status(404).json({
        success: false,
        error: 'API endpoint not found'
      });
    }
    res.sendFile(path.resolve(frontendPath, 'index.html'));
  });
} else {
  // 404 handler for API routes in development
  app.use('*', (req, res) => {
    // Skip API routes
    if (req.path.startsWith('/api')) {
      return res.status(404).json({
        success: false,
        error: `Route not found: ${req.method} ${req.path}`
      });
    }
    res.status(404).json({
      success: false,
      error: 'Route not found'
    });
  });
}

// Error handler (should be last)
app.use(errorHandler);

export default app;