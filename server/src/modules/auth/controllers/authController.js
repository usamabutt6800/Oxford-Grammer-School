import User from '../../users/models/User.js';
import asyncHandler from '../../../middlewares/asyncHandler.js';
import jwt from 'jsonwebtoken';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// @desc    Login user
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Please provide email and password'
    });
  }

  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  }

  const isPasswordMatch = await user.comparePassword(password);

  if (!isPasswordMatch) {
    return res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  }

  // Check if user is active
  if (user.isActive === false) {
    return res.status(401).json({
      success: false,
      error: 'Account is deactivated'
    });
  }

  user.lastLogin = new Date();
  await user.save();

  const token = generateToken(user._id);

  res.status(200).json({
    success: true,
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token
    }
  });
});

// @desc    Get current user
export const getMe = asyncHandler(async (req, res) => {
  console.log('getMe called - user from middleware:', req.user);
  
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Not authorized - no user in request'
    });
  }
  
  const user = await User.findById(req.user.id).select('-password');
  
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }

  res.status(200).json({
    success: true,
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      isActive: user.isActive
    }
  });
});

// @desc    Logout user
export const logout = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Update password
export const updatePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('+password');

  const isMatch = await user.comparePassword(req.body.currentPassword);

  if (!isMatch) {
    return res.status(401).json({
      success: false,
      error: 'Current password is incorrect'
    });
  }

  user.password = req.body.newPassword;
  await user.save();

  const token = generateToken(user._id);

  res.status(200).json({
    success: true,
    data: { token }
  });
});

// @desc    Update user details
export const updateDetails = asyncHandler(async (req, res) => {
  const fieldsToUpdate = {
    name: req.body.name,
    phone: req.body.phone,
    address: req.body.address
  };

  const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Register admin (first time only)
export const registerAdmin = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;

  const adminExists = await User.findOne({ role: 'admin' });
  if (adminExists) {
    return res.status(400).json({
      success: false,
      error: 'Admin already exists'
    });
  }

  const admin = await User.create({
    name,
    email,
    password,
    phone,
    role: 'admin',
    isActive: true
  });

  const token = generateToken(admin._id);

  res.status(201).json({
    success: true,
    data: {
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      token
    }
  });
});