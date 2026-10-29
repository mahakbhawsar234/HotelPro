const Razorpay = require('razorpay');
const crypto = require('crypto');
const Payment = require('../models/Payment.model');
const Booking = require('../models/Booking.model');
const Notification = require('../models/Notification.model');
const { asyncHandler, createError } = require('../utils/helpers.util');

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// @desc    Create Razorpay order
// @route   POST /api/payments/create-order
// @access  Private (guest)
exports.createOrder = asyncHandler(async (req, res, next) => {
  const { bookingId } = req.body;
  const booking = await Booking.findById(bookingId);
  if (!booking) return next(createError('Booking not found', 404));

  if (booking.guest.toString() !== req.user._id.toString()) {
    return next(createError('Not authorized', 403));
  }
  if (booking.paymentStatus === 'paid') {
    return next(createError('Booking is already paid', 400));
  }

  const orderOptions = {
    amount:   Math.round(booking.totalAmount * 100), // paise
    currency: 'INR',
    receipt:  booking.bookingRef,
    notes: {
      bookingId:  booking._id.toString(),
      guestEmail: req.user.email,
      hotelId:    booking.hotel.toString(),
    },
  };

  const order = await razorpay.orders.create(orderOptions);

  // Create pending payment record
  await Payment.create({
    booking:          bookingId,
    user:             req.user._id,
    hotel:            booking.hotel,
    amount:           booking.totalAmount,
    paymentMethod:    'razorpay',
    status:           'pending',
    razorpayOrderId:  order.id,
  });

  res.json({
    success: true,
    order: {
      id:        order.id,
      amount:    order.amount,
      currency:  order.currency,
      receipt:   order.receipt,
    },
    keyId: process.env.RAZORPAY_KEY_ID,
  });
});

// @desc    Verify Razorpay payment
// @route   POST /api/payments/verify
// @access  Private (guest)
exports.verifyPayment = asyncHandler(async (req, res, next) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = req.body;

  // Verify signature
  const body = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    return next(createError('Payment verification failed. Invalid signature.', 400));
  }

  // Update payment record
  const payment = await Payment.findOneAndUpdate(
    { razorpayOrderId: razorpay_order_id },
    {
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      status:            'completed',
    },
    { new: true }
  );

  // Update booking status
  const booking = await Booking.findByIdAndUpdate(
    bookingId,
    { status: 'confirmed', paymentStatus: 'paid', confirmedAt: new Date() },
    { new: true }
  ).populate(['guest', 'room', 'hotel']);

  // Notification
  await Notification.create({
    recipient: req.user._id,
    type: 'payment_success',
    title: 'Payment Successful 🎉',
    message: `Payment of ₹${booking.totalAmount.toLocaleString()} received for booking ${booking.bookingRef}.`,
    data: { bookingId: booking._id, paymentId: payment._id },
    priority: 'high',
  });

  res.json({ success: true, message: 'Payment verified successfully', payment, booking });
});

// @desc    Process refund
// @route   POST /api/payments/:id/refund
// @access  Private (admin/hotel_manager)
exports.processRefund = asyncHandler(async (req, res, next) => {
  const { amount, reason } = req.body;
  const payment = await Payment.findById(req.params.id);
  if (!payment) return next(createError('Payment not found', 404));
  if (payment.status !== 'completed') return next(createError('Cannot refund a non-completed payment', 400));

  const refundAmount = amount || payment.amount;

  // Razorpay refund
  const refund = await razorpay.payments.refund(payment.razorpayPaymentId, {
    amount: Math.round(refundAmount * 100),
    notes: { reason: reason || 'Customer requested refund' },
  });

  payment.refundAmount    = refundAmount;
  payment.refundReason    = reason;
  payment.refundedAt      = new Date();
  payment.razorpayRefundId = refund.id;
  payment.status          = refundAmount >= payment.amount ? 'refunded' : 'partially_refunded';
  await payment.save();

  // Notify guest
  const booking = await Booking.findById(payment.booking).populate('guest');
  if (booking?.guest) {
    await Notification.create({
      recipient: booking.guest._id,
      type: 'refund_processed',
      title: 'Refund Processed',
      message: `A refund of ₹${refundAmount.toLocaleString()} has been processed for booking ${booking.bookingRef}.`,
      priority: 'high',
    });
  }

  res.json({ success: true, message: 'Refund processed successfully', payment, refund });
});

// @desc    Get payment details
// @route   GET /api/payments/:id
// @access  Private
exports.getPayment = asyncHandler(async (req, res, next) => {
  const payment = await Payment.findById(req.params.id)
    .populate('booking', 'bookingRef checkInDate checkOutDate totalAmount')
    .populate('user', 'firstName lastName email');
  if (!payment) return next(createError('Payment not found', 404));
  res.json({ success: true, payment });
});

// @desc    Get all payments (admin)
// @route   GET /api/payments
// @access  Private (admin/hotel_manager)
exports.getPayments = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const query = {};
  if (status) query.status = status;
  if (req.user.role === 'hotel_manager') query.hotel = req.user.hotelId;

  const skip = (page - 1) * limit;
  const [payments, total] = await Promise.all([
    Payment.find(query)
      .populate('booking', 'bookingRef')
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Payment.countDocuments(query),
  ]);

  const totalRevenue = await Payment.aggregate([
    { $match: { ...query, status: 'completed' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  res.json({
    success: true,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: Number(page),
    totalRevenue: totalRevenue[0]?.total || 0,
    payments,
  });
});
