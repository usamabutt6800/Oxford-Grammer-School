
import Holiday from '../models/Holiday.js';
import asyncHandler from '../../../middlewares/asyncHandler.js';
import { startOfYear, endOfYear, format, parseISO } from 'date-fns';

// @desc    Get all holidays
// @route   GET /api/v1/holidays
// @access  Private (Admin)
export const getHolidays = asyncHandler(async (req, res) => {
  const { year, type } = req.query;
  
  const query = {};
  
  if (year) {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    query.date = {
      $gte: startDate,
      $lte: endDate
    };
  }
  
  if (type) {
    query.type = type;
  }

  const holidays = await Holiday.find(query)
    .populate('createdBy', 'name')
    .populate('updatedBy', 'name')
    .sort({ date: 1 })
    .lean();

  res.status(200).json({
    success: true,
    count: holidays.length,
    data: holidays
  });
});

// @desc    Get single holiday
// @route   GET /api/v1/holidays/:id
// @access  Private (Admin)
export const getHoliday = asyncHandler(async (req, res) => {
  const holiday = await Holiday.findById(req.params.id)
    .populate('createdBy', 'name')
    .populate('updatedBy', 'name');

  if (!holiday) {
    return res.status(404).json({
      success: false,
      error: 'Holiday not found'
    });
  }

  res.status(200).json({
    success: true,
    data: holiday
  });
});

// @desc    Create holiday
// @route   POST /api/v1/holidays
// @access  Private (Admin)
export const createHoliday = asyncHandler(async (req, res) => {
  const { date, title, description, type } = req.body;

  // Check if holiday already exists for this date
  const existingHoliday = await Holiday.findOne({
    date: {
      $gte: new Date(date).setHours(0, 0, 0, 0),
      $lt: new Date(date).setHours(23, 59, 59, 999)
    }
  });

  if (existingHoliday) {
    return res.status(400).json({
      success: false,
      error: 'Holiday already exists for this date'
    });
  }

  const holiday = await Holiday.create({
    ...req.body,
    createdBy: req.user.id
  });

  res.status(201).json({
    success: true,
    data: holiday
  });
});

// @desc    Update holiday
// @route   PUT /api/v1/holidays/:id
// @access  Private (Admin)
export const updateHoliday = asyncHandler(async (req, res) => {
  let holiday = await Holiday.findById(req.params.id);

  if (!holiday) {
    return res.status(404).json({
      success: false,
      error: 'Holiday not found'
    });
  }

  holiday = await Holiday.findByIdAndUpdate(
    req.params.id,
    { ...req.body, updatedBy: req.user.id },
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    data: holiday
  });
});

// @desc    Delete holiday
// @route   DELETE /api/v1/holidays/:id
// @access  Private (Admin)
export const deleteHoliday = asyncHandler(async (req, res) => {
  const holiday = await Holiday.findById(req.params.id);

  if (!holiday) {
    return res.status(404).json({
      success: false,
      error: 'Holiday not found'
    });
  }

  await holiday.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get holiday calendar
// @route   GET /api/v1/holidays/calendar/:year
// @access  Private (Admin/Teacher)
export const getHolidayCalendar = asyncHandler(async (req, res) => {
  const year = parseInt(req.params.year) || new Date().getFullYear();
  
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);

  const holidays = await Holiday.find({
    date: {
      $gte: startDate,
      $lte: endDate
    }
  })
  .sort('date')
  .lean();

  // Group holidays by month
  const calendar = {};
  holidays.forEach(holiday => {
    const month = format(new Date(holiday.date), 'MMMM');
    if (!calendar[month]) {
      calendar[month] = [];
    }
    calendar[month].push({
      date: holiday.date,
      title: holiday.title,
      type: holiday.type,
      description: holiday.description
    });
  });

  res.status(200).json({
    success: true,
    data: {
      year,
      holidays: calendar
    }
  });
});
