const crypto = require('crypto');
const User = require('../models/User.model');
const Notification = require('../models/Notification.model');
const { asyncHandler, sendTokenResponse, createError } = require('../utils/helpers.util');
const { sendEmail, emailTemplates } = require('../utils/email.util');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = asyncHandler(async (req, res, next) => {
  const { firstName, lastName, email, password, phone, role } = req.body;

  // Prevent direct admin creation via API
  const allowedRoles = ['guest', 'staff'];
  const userRole = allowedRoles.includes(role) ? role : 'guest';

  const existingUser = await User.findOne({ email });
  if (existingUser) return next(createError('Email already registered', 400));

  const user = await User.create({ firstName, lastName, email, password, phone, role: userRole });

  // Send welcome email with verification
  const verificationToken = user.generateEmailVerificationToken();
  await user.save({ validateBeforeSave: false });
  const verificationUrl = `${process.env.CLIENT_URL}/verify-email/${verificationToken}`;
  const emailTemplate = emailTemplates.welcomeEmail(user, verificationUrl);
  await sendEmail({ to: email, ...emailTemplate });

  // Create welcome notification
  await Notification.create({
    recipient: user._id,
    type: 'system_alert',
    title: 'Welcome to HotelPro! 🎉',
    message: 'Your account has been created. Please verify your email to get started.',
    priority: 'high',
  });

  sendTokenResponse(user, 201, res, 'Registration successful! Please check your email for verification.');
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) return next(createError('Please provide email and password', 400));

  const user = await User.findOne({ email }).select('+password');
  if (!user) return next(createError('Invalid credentials', 401));
  if (!user.isActive) return next(createError('Your account has been deactivated. Contact support.', 401));

  const isMatch = await user.comparePassword(password);
  if (!isMatch) return next(createError('Invalid credentials', 401));

  // Update last login
  user.lastLogin = Date.now();
  await user.save({ validateBeforeSave: false });

  sendTokenResponse(user, 200, res, 'Login successful');
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = asyncHandler(async (req, res) => {
  res.cookie('token', '', { expires: new Date(0), httpOnly: true });
  res.json({ success: true, message: 'Logged out successfully' });
});

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('hotelId', 'name address');
  res.json({ success: true, user });
});

// @desc    Verify email
// @route   GET /api/auth/verify-email/:token
// @access  Public
exports.verifyEmail = asyncHandler(async (req, res, next) => {
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpire: { $gt: Date.now() },
  });
  if (!user) return next(createError('Invalid or expired verification token', 400));

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpire = undefined;
  await user.save({ validateBeforeSave: false });

  res.json({ success: true, message: 'Email verified successfully! You can now log in.' });
});

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) return next(createError('No account found with that email', 404));

  const resetToken = user.generatePasswordResetToken();
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
  const emailTemplate = emailTemplates.passwordReset(user, resetUrl);
  const result = await sendEmail({ to: user.email, ...emailTemplate });

  if (!result.success) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });
    return next(createError('Failed to send reset email. Try again later.', 500));
  }

  res.json({ success: true, message: 'Password reset email sent!' });
});

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:token
// @access  Public
exports.resetPassword = asyncHandler(async (req, res, next) => {
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() },
  });
  if (!user) return next(createError('Invalid or expired reset token', 400));

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  sendTokenResponse(user, 200, res, 'Password reset successful');
});

// @desc    Update password
// @route   PUT /api/auth/update-password
// @access  Private
exports.updatePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) return next(createError('Current password is incorrect', 401));

  user.password = newPassword;
  await user.save();

  sendTokenResponse(user, 200, res, 'Password updated successfully');
});
