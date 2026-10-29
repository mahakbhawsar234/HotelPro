const Booking = require('../models/Booking.model');
const Room = require('../models/Room.model');
const Hotel = require('../models/Hotel.model');
const Payment = require('../models/Payment.model');
const Notification = require('../models/Notification.model');
const { asyncHandler, calculateNights, createError } = require('../utils/helpers.util');
const { sendEmail, emailTemplates } = require('../utils/email.util');

// @desc    Create booking
// @route   POST /api/bookings
// @access  Private (guest)
exports.createBooking = asyncHandler(async (req, res, next) => {
  const { roomId, hotelId, checkInDate, checkOutDate, adults, children, specialRequests } = req.body;

  // Validate dates
  const checkIn  = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);
  if (checkIn >= checkOut) return next(createError('Check-out must be after check-in', 400));
  if (checkIn < new Date()) return next(createError('Check-in date cannot be in the past', 400));

  // Check room exists and is active
  const room  = await Room.findById(roomId);
  const hotel = await Hotel.findById(hotelId);
  if (!room || !room.isActive) return next(createError('Room not found or unavailable', 404));
  if (!hotel || !hotel.isActive) return next(createError('Hotel not found', 404));

  // Check availability (no overlapping confirmed/checked_in bookings)
  const overlapping = await Booking.findOne({
    room: roomId,
    status: { $in: ['confirmed', 'checked_in', 'pending'] },
    $or: [
      { checkInDate: { $lt: checkOut }, checkOutDate: { $gt: checkIn } },
    ],
  });
  if (overlapping) return next(createError('Room is not available for selected dates', 409));

  // Calculate pricing
  const nights = calculateNights(checkIn, checkOut);
  const roomPrice = room.pricePerNight * nights;
  const taxAmount = (roomPrice * (hotel.taxPercent || 18)) / 100;
  const totalAmount = roomPrice + taxAmount;

  const booking = await Booking.create({
    guest: req.user._id,
    hotel: hotelId,
    room: roomId,
    checkInDate: checkIn,
    checkOutDate: checkOut,
    numberOfNights: nights,
    numberOfGuests: (adults || 1) + (children || 0),
    adults: adults || 1,
    children: children || 0,
    roomPrice,
    taxAmount,
    totalAmount,
    specialRequests,
    status: 'pending',
  });

  await booking.populate(['guest', 'room', 'hotel']);

  // Send email confirmation
  const emailData = emailTemplates.bookingConfirmation(booking, booking.guest, booking.room, booking.hotel);
  await sendEmail({ to: req.user.email, ...emailData });

  // Create notification
  await Notification.create({
    recipient: req.user._id,
    type: 'booking_confirmed',
    title: 'Booking Created',
    message: `Your booking ${booking.bookingRef} has been created. Complete payment to confirm.`,
    data: { bookingId: booking._id },
  });

  // Update user booking count
  await require('../models/User.model').findByIdAndUpdate(req.user._id, { $inc: { totalBookings: 1 } });

  res.status(201).json({ success: true, message: 'Booking created successfully', booking });
});

// @desc    Get all bookings (admin/staff view all, guest view own)
// @route   GET /api/bookings
// @access  Private
exports.getBookings = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10, hotelId } = req.query;
  const query = {};

  if (req.user.role === 'guest') {
    query.guest = req.user._id;
  } else if (req.user.role === 'staff' || req.user.role === 'hotel_manager') {
    query.hotel = req.user.hotelId;
    if (hotelId) query.hotel = hotelId;
  }

  if (status) query.status = status;

  const skip = (page - 1) * limit;
  const [bookings, total] = await Promise.all([
    Booking.find(query)
      .populate('guest', 'firstName lastName email phone')
      .populate('room', 'roomNumber category floor images')
      .populate('hotel', 'name address')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Booking.countDocuments(query),
  ]);

  res.json({
    success: true,
    count: bookings.length,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: Number(page),
    bookings,
  });
});

// @desc    Get single booking
// @route   GET /api/bookings/:id
// @access  Private
exports.getBooking = asyncHandler(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id)
    .populate('guest', 'firstName lastName email phone avatar')
    .populate('room')
    .populate('hotel')
    .populate('cancelledBy', 'firstName lastName');

  if (!booking) return next(createError('Booking not found', 404));

  // Authorization check
  if (req.user.role === 'guest' && booking.guest._id.toString() !== req.user._id.toString()) {
    return next(createError('Not authorized to view this booking', 403));
  }

  res.json({ success: true, booking });
});

// @desc    Cancel booking
// @route   PUT /api/bookings/:id/cancel
// @access  Private
exports.cancelBooking = asyncHandler(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id).populate('hotel').populate('room');
  if (!booking) return next(createError('Booking not found', 404));

  if (req.user.role === 'guest' && booking.guest.toString() !== req.user._id.toString()) {
    return next(createError('Not authorized', 403));
  }

  if (['cancelled', 'checked_out'].includes(booking.status)) {
    return next(createError(`Cannot cancel a booking with status: ${booking.status}`, 400));
  }

  booking.status = 'cancelled';
  booking.cancellationReason = req.body.reason || 'Cancelled by user';
  booking.cancelledAt = new Date();
  booking.cancelledBy = req.user._id;
  await booking.save();

  // Update room status back to available if checked_in
  if (booking.status === 'checked_in') {
    await Room.findByIdAndUpdate(booking.room._id, { status: 'available' });
  }

  // Notification
  await Notification.create({
    recipient: booking.guest,
    type: 'booking_cancelled',
    title: 'Booking Cancelled',
    message: `Your booking ${booking.bookingRef} has been cancelled.`,
    data: { bookingId: booking._id },
    priority: 'high',
  });

  const emailData = emailTemplates.cancellationConfirmation(booking, req.user, booking.hotel);
  await sendEmail({ to: req.user.email, ...emailData });

  res.json({ success: true, message: 'Booking cancelled successfully', booking });
});

// @desc    Update booking (staff/admin)
// @route   PUT /api/bookings/:id
// @access  Private (staff, admin)
exports.updateBooking = asyncHandler(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return next(createError('Booking not found', 404));

  const allowedUpdates = ['status', 'staffNotes', 'specialRequests', 'paymentStatus', 'addons'];
  allowedUpdates.forEach(field => {
    if (req.body[field] !== undefined) booking[field] = req.body[field];
  });

  booking.modifiedAt = new Date();
  await booking.save();
  await booking.populate(['guest', 'room', 'hotel']);

  res.json({ success: true, message: 'Booking updated', booking });
});

// @desc    Get booking availability for a room
// @route   GET /api/bookings/availability/:roomId
// @access  Public
exports.checkAvailability = asyncHandler(async (req, res) => {
  const { checkIn, checkOut } = req.query;
  const { roomId } = req.params;

  const overlapping = await Booking.find({
    room: roomId,
    status: { $in: ['confirmed', 'checked_in', 'pending'] },
    $or: [{ checkInDate: { $lt: new Date(checkOut) }, checkOutDate: { $gt: new Date(checkIn) } }],
  }).select('checkInDate checkOutDate status');

  res.json({ success: true, available: overlapping.length === 0, conflictingBookings: overlapping });
});

// @desc    Get upcoming bookings (check-in reminders)
// @route   GET /api/bookings/upcoming
// @access  Private (admin/staff)
exports.getUpcomingCheckIns = asyncHandler(async (req, res) => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 2);

  const bookings = await Booking.find({
    checkInDate: { $gte: tomorrow, $lt: dayAfter },
    status: 'confirmed',
    ...(req.user.role !== 'admin' && { hotel: req.user.hotelId }),
  }).populate('guest', 'firstName lastName email phone').populate('room', 'roomNumber category floor');

  res.json({ success: true, count: bookings.length, bookings });
});
