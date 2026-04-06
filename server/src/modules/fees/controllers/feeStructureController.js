
import FeeStructure from '../models/FeeStructure.js';
import asyncHandler from '../../../middlewares/asyncHandler.js';

// @desc    Get all fee structures
// @route   GET /api/v1/fee-structure
// @access  Private (Admin)
export const getFeeStructures = asyncHandler(async (req, res) => {
  const feeStructures = await FeeStructure.find()
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email')
    .sort({ class: 1 })
    .lean();

  res.status(200).json({
    success: true,
    data: feeStructures
  });
});

// @desc    Get fee structure by class
// @route   GET /api/v1/fee-structure/:class
// @access  Private (Admin)
export const getFeeStructureByClass = asyncHandler(async (req, res) => {
  const feeStructure = await FeeStructure.findOne({ class: req.params.class });

  if (!feeStructure) {
    // Return default fees if not found
    const defaultFees = {
      class: req.params.class,
      tuitionFee: getDefaultFee(req.params.class),
      admissionFee: 0,
      examFee: 0,
      otherCharges: 0,
      totalFee: getDefaultFee(req.params.class)
    };
    
    return res.status(200).json({
      success: true,
      data: defaultFees,
      message: 'Using default fee structure'
    });
  }

  res.status(200).json({
    success: true,
    data: feeStructure
  });
});

// @desc    Create or update fee structure
// @route   POST /api/v1/fee-structure
// @access  Private (Admin)
export const createOrUpdateFeeStructure = asyncHandler(async (req, res) => {
  const { class: className, ...feeData } = req.body;

  // Check if fee structure exists for this class
  let feeStructure = await FeeStructure.findOne({ class: className });

  if (feeStructure) {
    // Update existing
    feeStructure = await FeeStructure.findOneAndUpdate(
      { class: className },
      { ...feeData, updatedBy: req.user.id },
      { new: true, runValidators: true }
    );
  } else {
    // Create new
    feeStructure = await FeeStructure.create({
      class: className,
      ...feeData,
      createdBy: req.user.id
    });
  }

  res.status(200).json({
    success: true,
    data: feeStructure,
    message: feeStructure.isNew ? 'Fee structure created' : 'Fee structure updated'
  });
});

// @desc    Delete fee structure
// @route   DELETE /api/v1/fee-structure/:class
// @access  Private (Admin)
export const deleteFeeStructure = asyncHandler(async (req, res) => {
  const feeStructure = await FeeStructure.findOneAndDelete({ class: req.params.class });

  if (!feeStructure) {
    return res.status(404).json({
      success: false,
      error: 'Fee structure not found'
    });
  }

  res.status(200).json({
    success: true,
    data: {},
    message: 'Fee structure deleted'
  });
});

// @desc    Get all classes with fees
// @route   GET /api/v1/fee-structure/all/classes
// @access  Private (Admin)
export const getAllClassesWithFees = asyncHandler(async (req, res) => {
  const classLevels = ['Play Group', 'Nursery', 'Prep', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
  
  const feeStructures = await FeeStructure.find();
  
  const classesWithFees = classLevels.map(className => {
    const feeStructure = feeStructures.find(fs => fs.class === className);
    
    if (feeStructure) {
      return {
        class: className,
        tuitionFee: feeStructure.tuitionFee,
        admissionFee: feeStructure.admissionFee || 0,
        examFee: feeStructure.examFee || 0,
        otherCharges: feeStructure.otherCharges || 0,
        totalFee: feeStructure.totalFee
      };
    } else {
      const defaultFee = getDefaultFee(className);
      return {
        class: className,
        tuitionFee: defaultFee,
        admissionFee: 0,
        examFee: 0,
        otherCharges: 0,
        totalFee: defaultFee
      };
    }
  });

  res.status(200).json({
    success: true,
    data: classesWithFees
  });
});

// Helper function for default fees based on class level
function getDefaultFee(className) {
  const defaultFees = {
    'Play Group': 3000,
    'Nursery': 3500,
    'Prep': 4000,
    '1': 4500,
    '2': 4700,
    '3': 5000,
    '4': 5200,
    '5': 5500,
    '6': 5800,
    '7': 6000,
    '8': 6200,
    '9': 6500,
    '10': 7000
  };
  
  return defaultFees[className] || 5000;
}
