// server/src/modules/auth/routes/authRoutes.js
// loginLimiter is already applied in app.js on all /api/v1/auth routes.
// Do NOT add it here again — that would double-restrict the login endpoint.

import express from 'express';
import {
  registerAdmin,
  login,
  logout,
  getMe,
  updatePassword,
  updateDetails
} from '../controllers/authController.js';
import { protect } from '../../../middlewares/auth.js';

const router = express.Router();

// Public routes
router.post('/register-admin', registerAdmin);
router.post('/login', login);

// Protected routes
router.get('/logout', protect, logout);
router.get('/me', protect, getMe);
router.put('/updatepassword', protect, updatePassword);
router.put('/updatedetails', protect, updateDetails);

export default router;