const Booking   = require('../models/Booking.model');
const Room      = require('../models/Room.model');
const CheckInOut = require('../models/CheckInOut.model');
const Notification = require('../models/Notification.model');
const { asyncHandler, createError } = require('../utils/helpers.util');

// @desc    Process guest check-in
// @route   POST /api/checkin
// @access  Private (staff, hotel_manager)
exports.processCheckIn = asyncHandler(async (req, res, next) => {
  const { bookingId, idProofType, idProofNumber, keyCardIssued, notes } = req.body;

  const booking = await Booking.findById(bookingId)
    .populate('guest', 'firstName lastName email phone')
    .populate('room')
    .populate('hotel');

  if (!booking) return next(createError('Booking not found', 404));
  if (booking.status !== 'confirmed') {
    return next(createError(`Cannot check-in. Booking status is: ${booking.status}`, 400));
  }
  if (booking.paymentStatus !== 'paid') {
    return next(createError('Payment must be completed before check-in', 400));
  }

  // Validate check-in date (allow 1-day early check-in)
  const today = new Date();
  const checkInDate = new Date(booking.checkInDate);
  const oneDayEarly = new Date(checkInDate);
  oneDayEarly.setDate(oneDayEarly.getDate() - 1);
  if (today < oneDayEarly) {
    return next(createError('Check-in date has not arrived yet', 400));
  }

  // Handle ID proof image
  let idProofImage;
  if (req.file) idProofImage = `/uploads/id-proofs/${req.file.filename}`;

  // Create check-in record
  const checkIn = await CheckInOut.create({
    booking:     bookingId,
    guest:       booking.guest._id,
    hotel:       booking.hotel._id,
    room:        booking.room._id,
    type:        'check_in',
    processedBy: req.user._id,
    idProofType,
    idProofNumber,
    idProofImage,
    keyCardIssued: keyCardIssued || 1,
    notes,
  });

  // Update booking and room status
  await Booking.findByIdAndUpdate(bookingId, { status: 'checked_in' });
  await Room.findByIdAndUpdate(booking.room._id, { status: 'occupied' });

  // Notify guest
  await Notification.create({
    recipient: booking.guest._id,
    type: 'system_alert',
    title: 'Check-In Successful! 🗝️',
    message: `Welcome, ${booking.guest.firstName}! You have been checked into Room ${booking.room.roomNumber}.`,
    priority: 'high',
  });

  res.status(201).json({
    success: true,
    message: `${booking.guest.firstName} ${booking.guest.lastName} checked in successfully`,
    checkIn,
    booking,
  });
});

// @desc    Process guest check-out
// @route   POST /api/checkin/checkout
// @access  Private (staff, hotel_manager)
exports.processCheckOut = asyncHandler(async (req, res, next) => {
  const { bookingId, roomCondition, damageNotes, earlyLateCharge, notes } = req.body;

  const booking = await Booking.findById(bookingId)
    .populate('guest', 'firstName lastName email')
    .populate('room')
    .populate('hotel');

  if (!booking) return next(createError('Booking not found', 404));
  if (booking.status !== 'checked_in') {
    return next(createError('Guest is not currently checked in', 400));
  }

  // Create check-out record
  const checkOut = await CheckInOut.create({
    booking:      bookingId,
    guest:        booking.guest._id,
    hotel:        booking.hotel._id,
    room:         booking.room._id,
    type:         'check_out',
    processedBy:  req.user._id,
    roomCondition: roomCondition || 'good',
    damageNotes,
    earlyLateCharge: earlyLateCharge || 0,
    notes,
  });

  // Update booking status and room status
  await Booking.findByIdAndUpdate(bookingId, { status: 'checked_out' });
  await Room.findByIdAndUpdate(booking.room._id, { status: 'cleaning' });

  // Notify guest
  await Notification.create({
    recipient: booking.guest._id,
    type: 'review_request',
    title: 'Thank You for Your Stay! ⭐',
    message: `We hope you enjoyed your stay at ${booking.hotel.name}. Please take a moment to leave a review.`,
    data: { bookingId: booking._id },
    priority: 'low',
  });

  res.json({
    success: true,
    message: `${booking.guest.firstName} ${booking.guest.lastName} checked out successfully`,
    checkOut,
    booking,
  });
});

// @desc    Get today's check-ins/check-outs
// @route   GET /api/checkin/today
// @access  Private (staff, hotel_manager)
exports.getTodayActivity = asyncHandler(async (req, res) => {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end   = new Date(); end.setHours(23, 59, 59, 999);

  const hotelFilter = req.user.role !== 'admin' ? { hotel: req.user.hotelId } : {};

  const [checkIns, checkOuts, expectedCheckIns, expectedCheckOuts] = await Promise.all([
    CheckInOut.find({ type: 'check_in',  actualTime: { $gte: start, $lte: end }, ...hotelFilter })
      .populate('guest', 'firstName lastName').populate('room', 'roomNumber category'),
    CheckInOut.find({ type: 'check_out', actualTime: { $gte: start, $lte: end }, ...hotelFilter })
      .populate('guest', 'firstName lastName').populate('room', 'roomNumber category'),
    Booking.find({ checkInDate:  { $gte: start, $lte: end }, status: 'confirmed', ...hotelFilter })
      .populate('guest', 'firstName lastName phone').populate('room', 'roomNumber category floor'),
    Booking.find({ checkOutDate: { $gte: start, $lte: end }, status: 'checked_in', ...hotelFilter })
      .populate('guest', 'firstName lastName phone').populate('room', 'roomNumber category floor'),
  ]);

  res.json({
    success: true,
    today: { checkIns, checkOuts, expectedCheckIns, expectedCheckOuts },
    counts: {
      checkIns:         checkIns.length,
      checkOuts:        checkOuts.length,
      expectedCheckIns: expectedCheckIns.length,
      expectedCheckOuts: expectedCheckOuts.length,
    },
  });
});

// @desc    Get check-in records
// @route   GET /api/checkin
// @access  Private (staff, hotel_manager, admin)
exports.getCheckInOutRecords = asyncHandler(async (req, res) => {
  const { type, page = 1, limit = 20 } = req.query;
  const query = {};
  if (type) query.type = type;
  if (req.user.role !== 'admin') query.hotel = req.user.hotelId;

  const skip = (page - 1) * limit;
  const [records, total] = await Promise.all([
    CheckInOut.find(query)
      .populate('guest', 'firstName lastName email')
      .populate('room', 'roomNumber category floor')
      .populate('processedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    CheckInOut.countDocuments(query),
  ]);

  res.json({ success: true, total, totalPages: Math.ceil(total / limit), records });
});
