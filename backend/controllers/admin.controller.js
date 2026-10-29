const User  = require('../models/User.model');
const Hotel = require('../models/Hotel.model');
const { asyncHandler, createError } = require('../utils/helpers.util');

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (admin)
exports.getAllUsers = asyncHandler(async (req, res) => {
  const { role, isActive, page = 1, limit = 20, search } = req.query;
  const query = {};
  if (role) query.role = role;
  if (isActive !== undefined) query.isActive = isActive === 'true';
  if (search) {
    query.$or = [
      { firstName: new RegExp(search, 'i') },
      { lastName:  new RegExp(search, 'i') },
      { email:     new RegExp(search, 'i') },
    ];
  }
  const skip = (page - 1) * limit;
  const [users, total] = await Promise.all([
    User.find(query).populate('hotelId', 'name').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    User.countDocuments(query),
  ]);
  res.json({ success: true, total, totalPages: Math.ceil(total / limit), users });
});

// @desc    Update user (admin)
// @route   PUT /api/admin/users/:id
// @access  Private (admin)
exports.updateUser = asyncHandler(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!user) return next(createError('User not found', 404));
  res.json({ success: true, message: 'User updated', user });
});

// @desc    Toggle user active/inactive
// @route   PATCH /api/admin/users/:id/toggle
// @access  Private (admin)
exports.toggleUserStatus = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return next(createError('User not found', 404));
  user.isActive = !user.isActive;
  await user.save({ validateBeforeSave: false });
  res.json({ success: true, message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`, user });
});

// @desc    Create staff/manager account
// @route   POST /api/admin/staff
// @access  Private (admin)
exports.createStaff = asyncHandler(async (req, res, next) => {
  const { firstName, lastName, email, password, phone, role, hotelId } = req.body;
  const allowedRoles = ['staff', 'hotel_manager'];
  if (!allowedRoles.includes(role)) return next(createError('Invalid role for staff creation', 400));

  const exists = await User.findOne({ email });
  if (exists) return next(createError('Email already registered', 400));

  const user = await User.create({ firstName, lastName, email, password, phone, role, hotelId, isEmailVerified: true });
  res.status(201).json({ success: true, message: 'Staff account created', user });
});

// @desc    Get system overview stats
// @route   GET /api/admin/stats
// @access  Private (admin)
exports.getSystemStats = asyncHandler(async (req, res) => {
  const [totalUsers, byRole, totalHotels, activeHotels] = await Promise.all([
    User.countDocuments(),
    User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    Hotel.countDocuments(),
    Hotel.countDocuments({ isActive: true }),
  ]);
  res.json({ success: true, stats: { totalUsers, byRole, totalHotels, activeHotels } });
});
