const Review  = require('../models/Review.model');
const Booking = require('../models/Booking.model');
const Hotel   = require('../models/Hotel.model');
const Room    = require('../models/Room.model');
const { asyncHandler, createError } = require('../utils/helpers.util');

exports.createReview = asyncHandler(async (req, res, next) => {
  const { bookingId, rating, title, comment, ratings } = req.body;
  const booking = await Booking.findById(bookingId);
  if (!booking) return next(createError('Booking not found', 404));
  if (booking.guest.toString() !== req.user._id.toString()) return next(createError('Not authorized', 403));
  if (booking.status !== 'checked_out') return next(createError('You can only review after check-out', 400));

  const existing = await Review.findOne({ booking: bookingId, guest: req.user._id });
  if (existing) return next(createError('You have already reviewed this booking', 400));

  const images = req.files?.map(f => `/uploads/misc/${f.filename}`) || [];
  const review = await Review.create({
    booking: bookingId, guest: req.user._id,
    hotel: booking.hotel, room: booking.room,
    rating, title, comment, ratings, images,
  });

  // Update hotel & room avg rating
  const hotelAvg = await Review.aggregate([
    { $match: { hotel: booking.hotel, isPublished: true } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  await Hotel.findByIdAndUpdate(booking.hotel, { avgRating: hotelAvg[0]?.avg || 0, totalReviews: hotelAvg[0]?.count || 0 });

  await review.populate('guest', 'firstName lastName avatar');
  res.status(201).json({ success: true, message: 'Review submitted successfully', review });
});

exports.getReviews = asyncHandler(async (req, res) => {
  const { hotelId, page = 1, limit = 10, minRating } = req.query;
  const query = { isPublished: true };
  if (hotelId) query.hotel = hotelId;
  if (minRating) query.rating = { $gte: Number(minRating) };

  const skip = (page - 1) * limit;
  const [reviews, total] = await Promise.all([
    Review.find(query)
      .populate('guest', 'firstName lastName avatar')
      .populate('hotel', 'name')
      .sort({ createdAt: -1 })
      .skip(skip).limit(Number(limit)),
    Review.countDocuments(query),
  ]);
  res.json({ success: true, total, totalPages: Math.ceil(total / limit), reviews });
});

exports.addStaffResponse = asyncHandler(async (req, res, next) => {
  const review = await Review.findByIdAndUpdate(req.params.id,
    { response: { text: req.body.response, respondedBy: req.user._id, respondedAt: new Date() } },
    { new: true }
  ).populate('guest', 'firstName lastName');
  if (!review) return next(createError('Review not found', 404));
  res.json({ success: true, message: 'Response added', review });
});
