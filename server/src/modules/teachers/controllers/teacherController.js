
import Teacher from '../models/Teacher.js';
import User from '../../users/models/User.js';
import asyncHandler from '../../../middlewares/asyncHandler.js';

// Helper function to generate employee ID
const generateEmployeeId = async () => {
  const currentYear = new Date().getFullYear();
  const lastTeacher = await Teacher.findOne().sort({ employeeId: -1 });
  
  if (lastTeacher && lastTeacher.employeeId) {
    const match = lastTeacher.employeeId.match(/OGS-\d+-(\d+)/);
    const lastNumber = match ? parseInt(match[1]) : 0;
    return `OGS-${currentYear}-${String(lastNumber + 1).padStart(3, '0')}`;
  }
  return `OGS-${currentYear}-001`;
};

// @desc    Get all teachers
// @route   GET /api/v1/teachers
// @access  Private (Admin)
export const getTeachers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, status, sort = 'firstName' } = req.query;
  
  const query = {};
  
  // Apply filters
  if (status) query.status = status;
  
  // Search functionality
  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { employeeId: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { qualification: { $regex: search, $options: 'i' } }
    ];
  }
  
  const teachers = await Teacher.find(query)
    .populate({
      path: 'userId',
      select: 'name email role isActive lastLogin'
    })
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email')
    .sort({ [sort]: 1, lastName: 1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .lean();
  
  const total = await Teacher.countDocuments(query);
  
  res.status(200).json({
    success: true,
    count: teachers.length,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: parseInt(page),
    data: teachers
  });
});

// @desc    Get single teacher
// @route   GET /api/v1/teachers/:id
// @access  Private (Admin)
export const getTeacher = asyncHandler(async (req, res) => {
  const teacher = await Teacher.findById(req.params.id)
    .populate({
      path: 'userId',
      select: 'name email role isActive lastLogin'
    })
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email');
  
  if (!teacher) {
    return res.status(404).json({
      success: false,
      error: 'Teacher not found'
    });
  }
  
  res.status(200).json({
    success: true,
    data: teacher
  });
});

// @desc    Create teacher
// @route   POST /api/v1/teachers
// @access  Private (Admin)
export const createTeacher = asyncHandler(async (req, res) => {
  const { 
    email, 
    password = 'Teacher@123', 
    firstName, 
    lastName, 
    phone, 
    qualification,
    experience,
    salary,
    subjects = [],
    assignedClasses = [],
    dateOfBirth,
    gender = 'Male',
    cnic,
    address = {},
    designation = 'Teacher',
    ...otherData 
  } = req.body;

  // Step 1: Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      error: 'User with this email already exists'
    });
  }

  // Step 2: Generate employee ID
  const employeeId = await generateEmployeeId();

  // Step 3: Create User (for login)
  // In the createTeacher function, update the User creation part:
const user = await User.create({
  employeeId,
  name: `${firstName} ${lastName}`.trim(),
  email,
  password: password, // Use provided password instead of default
  role: 'teacher',
  phone,
  qualification,
  experience: experience?.toString(),
  salary: salary ? parseFloat(salary) : undefined,
  subjects: Array.isArray(subjects) ? subjects : [],
  assignedClasses: Array.isArray(assignedClasses) ? assignedClasses.map(cls => {
    if (typeof cls === 'string') {
      const [clsName, section] = cls.split('-');
      return `${clsName}-${section || 'A'}`;
    }
    return `${cls.class}-${cls.section}`;
  }) : [],
  isActive: true,
  createdBy: req.user.id
});

  // Step 4: Create Teacher profile
  const teacherData = {
    employeeId,
    userId: user._id,
    firstName,
    lastName,
    email,
    phone,
    qualification,
    experience: parseInt(experience) || 0,
    salary: salary ? parseFloat(salary) : 0,
    subjects: Array.isArray(subjects) ? subjects : [],
    assignedClasses: Array.isArray(assignedClasses) ? assignedClasses.map(cls => {
      // Convert string like "10-A" to object { class: "10", section: "A" }
      if (typeof cls === 'string') {
        const [clsName, section] = cls.split('-');
        return { class: clsName, section: section || 'A' };
      }
      return cls;
    }) : [],
    dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
    gender,
    cnic,
    address,
    designation,
    status: 'Active',
    createdBy: req.user.id,
    ...otherData
  };

  const teacher = await Teacher.create(teacherData);

  // Step 5: Return response
  res.status(201).json({
    success: true,
    data: {
      ...teacher.toObject(),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }
    }
  });
});

// @desc    Update teacher
// @route   PUT /api/v1/teachers/:id
// @access  Private (Admin)
// @desc    Update teacher
// @route   PUT /api/v1/teachers/:id
// @access  Private (Admin)
// @desc    Update teacher
// @route   PUT /api/v1/teachers/:id
// @access  Private (Admin/Teacher - teacher can only update limited fields)
export const updateTeacher = asyncHandler(async (req, res) => {
  const teacher = await Teacher.findById(req.params.id);
  
  if (!teacher) {
    return res.status(404).json({
      success: false,
      error: 'Teacher not found'
    });
  }

  const { password, currentPassword, ...updateData } = req.body;

  // If teacher is updating (not admin)
  if (req.user.role === 'teacher') {
    // Teacher can only update their own profile
    if (teacher.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Teachers can only update their own profile'
      });
    }
    
    // Teachers can only update password (with current password verification)
    if (password) {
      const user = await User.findById(req.user._id).select('+password');
      
      // Teachers must provide current password
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          error: 'Current password is required to change password'
        });
      }
      
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: 'Current password is incorrect'
        });
      }
      
      // Update password
      user.password = password;
      user.updatedBy = req.user.id;
      await user.save();
      
      return res.status(200).json({
        success: true,
        data: teacher,
        message: 'Password updated successfully'
      });
    }
    
    // Teachers cannot update other fields
    return res.status(403).json({
      success: false,
      error: 'Teachers can only update their password'
    });
  }

  // ADMIN LOGIC (existing code)
  if (password) {
    const user = await User.findById(teacher.userId);
    if (user) {
      // Admin doesn't need current password verification
      if (currentPassword) {
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
          return res.status(401).json({
            success: false,
            error: 'Current password is incorrect'
          });
        }
      }
      
      user.password = password;
      user.updatedBy = req.user.id;
      await user.save();
    }
  }

  // Update Teacher profile
  const updatedTeacher = await Teacher.findByIdAndUpdate(
    req.params.id,
    { ...updateData, updatedBy: req.user.id },
    { new: true, runValidators: true }
  );

  // Also update the associated User details if needed
  if (updateData.firstName || updateData.lastName || updateData.email || updateData.phone) {
    const user = await User.findById(teacher.userId);
    if (user) {
      if (updateData.firstName || updateData.lastName) {
        user.name = `${updateData.firstName || teacher.firstName} ${updateData.lastName || teacher.lastName}`.trim();
      }
      if (updateData.email) user.email = updateData.email;
      if (updateData.phone) user.phone = updateData.phone;
      if (updateData.subjects) user.subjects = updateData.subjects;
      if (updateData.assignedClasses) {
        user.assignedClasses = updateData.assignedClasses.map(cls => 
          typeof cls === 'object' ? `${cls.class}-${cls.section}` : cls
        );
      }
      if (updateData.salary !== undefined) user.salary = updateData.salary;
      if (updateData.qualification) user.qualification = updateData.qualification;
      user.updatedBy = req.user.id;
      await user.save();
    }
  }

  res.status(200).json({
    success: true,
    data: updatedTeacher,
    message: password ? 'Teacher updated with password reset' : 'Teacher updated'
  });
});
// @desc    Delete teacher (mark as inactive)
// @route   DELETE /api/v1/teachers/:id
// @access  Private (Admin)
// @desc    Delete teacher permanently
// @route   DELETE /api/v1/teachers/:id
// @access  Private (Admin)
export const deleteTeacher = asyncHandler(async (req, res) => {
  const teacher = await Teacher.findById(req.params.id);
  
  if (!teacher) {
    return res.status(404).json({
      success: false,
      error: 'Teacher not found'
    });
  }

  // Delete associated User first
  const user = await User.findById(teacher.userId);
  if (user) {
    await user.deleteOne();
  }

  // Delete teacher permanently
  await teacher.deleteOne();

  res.status(200).json({
    success: true,
    data: { 
      message: 'Teacher deleted permanently from both Teacher and User models'
    }
  });
});
// @desc    Get teacher statistics
// @route   GET /api/v1/teachers/stats/summary
// @access  Private (Admin)
export const getTeacherStats = asyncHandler(async (req, res) => {
  const stats = await Teacher.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: { $sum: { $cond: [{ $eq: ['$status', 'Active'] }, 1, 0] } },
        inactive: { $sum: { $cond: [{ $eq: ['$status', 'Inactive'] }, 1, 0] } },
        onLeave: { $sum: { $cond: [{ $eq: ['$status', 'On Leave'] }, 1, 0] } },
        totalSalary: { $sum: '$salary' }
      }
    }
  ]);

  const designationWise = await Teacher.aggregate([
    {
      $group: {
        _id: '$designation',
        count: { $sum: 1 },
        avgSalary: { $avg: '$salary' }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  res.status(200).json({
    success: true,
    data: {
      summary: stats[0] || { 
        total: 0, 
        active: 0, 
        inactive: 0, 
        onLeave: 0, 
        totalSalary: 0 
      },
      designationWise
    }
  });
});

// @desc    Get teachers list for dropdown
// @route   GET /api/v1/teachers/list
// @access  Private (Admin/Teacher)
export const getTeachersList = asyncHandler(async (req, res) => {
  const teachers = await Teacher.find({ status: 'Active' })
    .select('employeeId firstName lastName qualification subjects assignedClasses')
    .sort({ firstName: 1 })
    .lean();
  
  res.status(200).json({
    success: true,
    data: teachers
  });
});
