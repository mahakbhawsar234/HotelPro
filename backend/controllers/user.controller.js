const User = require('../models/User.model');
const { asyncHandler, createError } = require('../utils/helpers.util');

exports.getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('hotelId', 'name address');
  res.json({ success: true, user });
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const allowedFields = ['firstName', 'lastName', 'phone', 'address', 'preferences'];
  const updates = {};
  allowedFields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

  if (req.file) updates.avatar = `/uploads/avatars/${req.file.filename}`;

  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
  res.json({ success: true, message: 'Profile updated', user });
});

exports.getUserById = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id).select('-password');
  if (!user) return next(createError('User not found', 404));
  res.json({ success: true, user });
});
