import express from 'express';
import {
  registerAdmin,
  login,
  logout,
  getMe,
  updatePassword,
  updateDetails
} from '../controllers/authController.js';
import { protect, authorize, loginLimiter } from '../../../middlewares/auth.js';

const router = express.Router();

// Public routes
router.post('/register-admin', registerAdmin);
router.post('/login', loginLimiter, login);

// Protected routes
router.get('/logout', protect, logout);
router.get('/me', protect, getMe);
router.put('/updatepassword', protect, updatePassword);
router.put('/updatedetails', protect, updateDetails);

export default router;