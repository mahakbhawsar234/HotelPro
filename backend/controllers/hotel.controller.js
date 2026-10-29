const Hotel  = require('../models/Hotel.model');
const Room   = require('../models/Room.model');
const Review = require('../models/Review.model');
const { asyncHandler, createError } = require('../utils/helpers.util');

exports.getHotels = asyncHandler(async (req, res) => {
  const { city, country, minRating, page = 1, limit = 10, sort = '-avgRating' } = req.query;
  const query = { isActive: true };
  if (city)    query['address.city']    = new RegExp(city, 'i');
  if (country) query['address.country'] = new RegExp(country, 'i');
  if (minRating) query.avgRating = { $gte: Number(minRating) };

  const sortObj = sort.startsWith('-') ? { [sort.slice(1)]: -1 } : { [sort]: 1 };
  const skip = (page - 1) * limit;

  const [hotels, total] = await Promise.all([
    Hotel.find(query).populate('manager', 'firstName lastName email').sort(sortObj).skip(skip).limit(Number(limit)),
    Hotel.countDocuments(query),
  ]);

  res.json({ success: true, count: hotels.length, total, totalPages: Math.ceil(total / limit), hotels });
});

exports.getHotel = asyncHandler(async (req, res, next) => {
  const hotel = await Hotel.findById(req.params.id).populate('manager', 'firstName lastName email');
  if (!hotel || !hotel.isActive) return next(createError('Hotel not found', 404));
  const rooms = await Room.find({ hotel: hotel._id, isActive: true }).select('category type pricePerNight status images floor maxOccupancy');
  res.json({ success: true, hotel, rooms });
});

exports.createHotel = asyncHandler(async (req, res) => {
  if (req.files?.hotelImages) req.body.images = req.files.hotelImages.map(f => `/uploads/hotels/${f.filename}`);
  const hotel = await Hotel.create({ ...req.body, manager: req.user._id });
  res.status(201).json({ success: true, message: 'Hotel created successfully', hotel });
});

exports.updateHotel = asyncHandler(async (req, res, next) => {
  let hotel = await Hotel.findById(req.params.id);
  if (!hotel) return next(createError('Hotel not found', 404));
  if (req.files?.hotelImages) req.body.images = req.files.hotelImages.map(f => `/uploads/hotels/${f.filename}`);
  hotel = await Hotel.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  res.json({ success: true, message: 'Hotel updated', hotel });
});

exports.deleteHotel = asyncHandler(async (req, res, next) => {
  const hotel = await Hotel.findById(req.params.id);
  if (!hotel) return next(createError('Hotel not found', 404));
  hotel.isActive = false;
  await hotel.save();
  res.json({ success: true, message: 'Hotel deactivated successfully' });
});

exports.getHotelReviews = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;
  const [reviews, total] = await Promise.all([
    Review.find({ hotel: req.params.id, isPublished: true })
      .populate('guest', 'firstName lastName avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Review.countDocuments({ hotel: req.params.id, isPublished: true }),
  ]);
  const avgRating = await Review.aggregate([
    { $match: { hotel: require('mongoose').Types.ObjectId.createFromHexString(req.params.id), isPublished: true } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  res.json({ success: true, total, totalPages: Math.ceil(total / limit), avgRating: avgRating[0]?.avg || 0, reviews });
});
