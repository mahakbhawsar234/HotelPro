// Async handler wrapper to avoid try/catch repetition
exports.asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Send token response
exports.sendTokenResponse = (user, statusCode, res, message = 'Success') => {
  const token = user.generateJWT();
  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  };
  const userObj = user.toObject();
  delete userObj.password;
  res
    .status(statusCode)
    .cookie('token', token, cookieOptions)
    .json({ success: true, message, token, user: userObj });
};

// Pagination helper
exports.paginate = (query, page = 1, limit = 10) => {
  const skip = (Number(page) - 1) * Number(limit);
  return { skip, limit: Number(limit) };
};

// Parse sort string: "price,-rating" -> { price: 1, rating: -1 }
exports.parseSort = (sortStr) => {
  if (!sortStr) return { createdAt: -1 };
  const sortObj = {};
  sortStr.split(',').forEach((field) => {
    if (field.startsWith('-')) {
      sortObj[field.slice(1)] = -1;
    } else {
      sortObj[field] = 1;
    }
  });
  return sortObj;
};

// Format currency (INR)
exports.formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

// Calculate number of nights
exports.calculateNights = (checkIn, checkOut) => {
  const diff = new Date(checkOut) - new Date(checkIn);
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

// Create error
exports.createError = (message, statusCode = 500) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};
