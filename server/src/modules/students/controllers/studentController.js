import Student from '../models/Student.js';
import asyncHandler from '../../../middlewares/asyncHandler.js';

// @desc    Get all students
// @route   GET /api/v1/students
// @access  Private (Admin/Teacher)
export const getStudents = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, class: className, section, status, search, sort = 'currentClass' } = req.query;
  
  const query = {};
  
  // Apply filters
  if (className) query.currentClass = className;
  if (section) query.section = section;
  if (status) query.status = status;
  
  // Search functionality
  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { fatherName: { $regex: search, $options: 'i' } },
      { admissionNo: { $regex: search, $options: 'i' } },
      { rollNo: { $regex: search, $options: 'i' } }
    ];
  }
  
  // Define class order for proper sorting
  const classOrder = {
    'Play Group': 1,
    'Nursery': 2,
    'Prep': 3,
    '1': 4, '2': 5, '3': 6, '4': 7, '5': 8,
    '6': 9, '7': 10, '8': 11, '9': 12, '10': 13
  };
  
  let sortQuery = {};
  
  if (sort === 'currentClass') {
    // Custom sorting for classes
    const students = await Student.find(query)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .lean();
    
    // Sort manually by class order
    students.sort((a, b) => {
      const orderA = classOrder[a.currentClass] || 14;
      const orderB = classOrder[b.currentClass] || 14;
      return orderA - orderB;
    });
    
    // Apply pagination manually
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedStudents = students.slice(startIndex, endIndex);
    
    const total = students.length;
    
    res.status(200).json({
      success: true,
      count: paginatedStudents.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: paginatedStudents
    });
    
  } else {
    // Default sorting
    const students = await Student.find(query)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ [sort]: 1, section: 1, rollNo: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();
    
    const total = await Student.countDocuments(query);
    
    res.status(200).json({
      success: true,
      count: students.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: students
    });
  }
});

// @desc    Get single student
// @route   GET /api/v1/students/:id
// @access  Private (Admin/Teacher)
export const getStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id)
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email');
  
  if (!student) {
    return res.status(404).json({
      success: false,
      error: 'Student not found'
    });
  }
  
  res.status(200).json({
    success: true,
    data: student
  });
});

// @desc    Get all distinct classes
// @route   GET /api/v1/students/classes
// @access  Private (Admin/Teacher)
export const getClasses = asyncHandler(async (req, res) => {
  const classes = await Student.distinct('currentClass');
  
  // Custom sort function to order classes properly
  const classOrder = (className) => {
    if (className === 'Play Group') return 0;
    if (className === 'Nursery') return 1;
    if (className === 'Prep') return 2;
    if (className === '1') return 3;
    if (className === '2') return 4;
    if (className === '3') return 5;
    if (className === '4') return 6;
    if (className === '5') return 7;
    if (className === '6') return 8;
    if (className === '7') return 9;
    if (className === '8') return 10;
    if (className === '9') return 11;
    if (className === '10') return 12;
    return 99;
  };
  
  const sortedClasses = classes.sort((a, b) => classOrder(a) - classOrder(b));
  
  res.status(200).json({
    success: true,
    data: sortedClasses
  });
});

// @desc    Create student
// @route   POST /api/v1/students
// @access  Private (Admin)
export const createStudent = asyncHandler(async (req, res) => {
  // Generate admission number
  const currentYear = new Date().getFullYear();
  const lastStudent = await Student.findOne().sort({ admissionNo: -1 });
  let admissionNo;
  
  if (lastStudent && lastStudent.admissionNo) {
    const lastNumber = parseInt(lastStudent.admissionNo.split('-')[1]) || 0;
    admissionNo = `${currentYear}-${String(lastNumber + 1).padStart(3, '0')}`;
  } else {
    admissionNo = `${currentYear}-001`;
  }
  
  // Generate roll number
  const classCount = await Student.countDocuments({
    currentClass: req.body.currentClass,
    section: req.body.section
  });
  const rollNo = `${req.body.currentClass}-${req.body.section}-${String(classCount + 1).padStart(2, '0')}`;
  
  // Properly structure the student data
  const studentData = {
    // Personal Info
    admissionNo,
    rollNo,
    firstName: req.body.firstName,
    lastName: req.body.lastName || '',
    fatherName: req.body.fatherName,
    motherName: req.body.motherName || '',
    dateOfBirth: req.body.dateOfBirth,
    gender: req.body.gender,
    currentClass: req.body.currentClass,
    section: req.body.section,
    
    // Contact Info - FLAT fields as per your model
    phone: req.body.phone || '',
    fatherPhone: req.body.fatherPhone || '',
    motherPhone: req.body.motherPhone || '',
    emergencyPhone: req.body.emergencyPhone || '',
    email: req.body.email || '',
    
    // Address - ensure it's properly structured
    address: req.body.address || {
      street: req.body.street || '',
      city: req.body.city || '',
      state: req.body.state || '',
      postalCode: req.body.postalCode || '',
      country: req.body.country || 'Pakistan'
    },
    
    // Admission Date
    admissionDate: req.body.admissionDate || new Date(),
    
    // Fee Structure
    feeStructure: {
      tuitionFee: req.body.feeStructure?.tuitionFee || classFees?.[req.body.currentClass] || 0,
      discountType: req.body.feeStructure?.discountType || 'None',
      discountPercentage: req.body.feeStructure?.discountPercentage || 0
    },
    
    // Status
    status: req.body.status || 'Active',
    
    // Metadata
    createdBy: req.user.id
  };
  
  // Clean up: Remove any undefined or empty fields
  Object.keys(studentData).forEach(key => {
    if (studentData[key] === undefined || studentData[key] === '') {
      delete studentData[key];
    }
  });
  
  // Clean up address object
  if (studentData.address) {
    Object.keys(studentData.address).forEach(key => {
      if (studentData.address[key] === undefined || studentData.address[key] === '') {
        delete studentData.address[key];
      }
    });
    
    // If address is empty, remove it
    if (Object.keys(studentData.address).length === 0) {
      delete studentData.address;
    }
  }
  
  const student = await Student.create(studentData);
  
  res.status(201).json({
    success: true,
    data: student
  });
});

// @desc    Update student
// @route   PUT /api/v1/students/:id
// @access  Private (Admin)
export const updateStudent = asyncHandler(async (req, res) => {
  let student = await Student.findById(req.params.id);
  
  if (!student) {
    return res.status(404).json({
      success: false,
      error: 'Student not found'
    });
  }
  
  // Prepare update data - start with a clean object
  const updateData = {};
  
  // Copy only allowed fields
  const allowedFields = [
    'firstName', 'lastName', 'fatherName', 'motherName',
    'dateOfBirth', 'gender', 'currentClass', 'section',
    'phone', 'fatherPhone', 'motherPhone', 'emergencyPhone',
    'email', 'status', 'admissionDate', 'remarks', 'address'
  ];
  
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  });
  
  // Handle feeStructure separately - ensure tuitionFee is included
  if (req.body.feeStructure) {
    updateData.feeStructure = {
      tuitionFee: req.body.feeStructure.tuitionFee !== undefined 
        ? req.body.feeStructure.tuitionFee 
        : student.feeStructure?.tuitionFee || 0,
      discountType: req.body.feeStructure.discountType !== undefined
        ? req.body.feeStructure.discountType
        : student.feeStructure?.discountType || 'None',
      discountPercentage: req.body.feeStructure.discountPercentage !== undefined
        ? req.body.feeStructure.discountPercentage
        : student.feeStructure?.discountPercentage || 0
    };
  }
  
  // Update roll number if class or section changes
  if (req.body.currentClass || req.body.section) {
    const newClass = req.body.currentClass || student.currentClass;
    const newSection = req.body.section || student.section;
    
    if (newClass !== student.currentClass || newSection !== student.section) {
      const classCount = await Student.countDocuments({
        currentClass: newClass,
        section: newSection,
        _id: { $ne: req.params.id }
      });
      updateData.rollNo = `${newClass}-${newSection}-${String(classCount + 1).padStart(2, '0')}`;
    }
  }
  
  // Add updatedBy
  updateData.updatedBy = req.user.id;
  
  // Remove any fields that shouldn't be updated
  delete updateData._id;
  delete updateData.__v;
  delete updateData.createdBy;
  delete updateData.createdAt;
  delete updateData.admissionNo;
  
  // Perform update with runValidators: true to ensure validation passes
  student = await Student.findByIdAndUpdate(
    req.params.id,
    updateData,
    { 
      new: true, 
      runValidators: true,
      context: 'query'
    }
  );
  
  res.status(200).json({
    success: true,
    data: student
  });
});

// @desc    Delete student
// @route   DELETE /api/v1/students/:id
// @access  Private (Admin)
export const deleteStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  
  if (!student) {
    return res.status(404).json({
      success: false,
      error: 'Student not found'
    });
  }
  
  // HARD DELETE - Remove from database
  await student.deleteOne();
  
  res.status(200).json({
    success: true,
    data: {
      message: 'Student deleted permanently'
    }
  });
});

// @desc    Get student statistics
// @route   GET /api/v1/students/stats/summary
// @access  Private (Admin)
export const getStudentStats = asyncHandler(async (req, res) => {
  const stats = await Student.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: { $sum: { $cond: [{ $eq: ['$status', 'Active'] }, 1, 0] } },
        inactive: { $sum: { $cond: [{ $eq: ['$status', 'Inactive'] }, 1, 0] } },
        graduated: { $sum: { $cond: [{ $eq: ['$status', 'Graduated'] }, 1, 0] } },
      }
    }
  ]);
  
  const classWise = await Student.aggregate([
    {
      $group: {
        _id: '$currentClass',
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);
  
  res.status(200).json({
    success: true,
    data: {
      summary: stats[0] || { total: 0, active: 0, inactive: 0, graduated: 0 },
      classWise
    }
  });
});