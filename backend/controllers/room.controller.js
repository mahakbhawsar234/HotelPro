const Room  = require('../models/Room.model');
const Hotel = require('../models/Hotel.model');
const Booking = require('../models/Booking.model');
const { asyncHandler, createError } = require('../utils/helpers.util');

// @desc    Get all rooms (with filters)
// @route   GET /api/rooms
// @access  Public
exports.getRooms = asyncHandler(async (req, res) => {
  const {
    hotelId, category, type, minPrice, maxPrice,
    maxOccupancy, status = 'available', checkIn, checkOut,
    page = 1, limit = 12, sort = 'pricePerNight',
  } = req.query;

  const query = { isActive: true };
  if (hotelId)      query.hotel    = hotelId;
  if (category)     query.category = category;
  if (type)         query.type     = type;
  if (status && req.user?.role !== 'guest') query.status = status;
  else query.status = 'available';
  if (maxOccupancy) query.maxOccupancy = { $gte: Number(maxOccupancy) };
  if (minPrice || maxPrice) {
    query.pricePerNight = {};
    if (minPrice) query.pricePerNight.$gte = Number(minPrice);
    if (maxPrice) query.pricePerNight.$lte = Number(maxPrice);
  }

  // Exclude rooms with overlapping bookings
  if (checkIn && checkOut) {
    const overlappingBookings = await Booking.find({
      status: { $in: ['confirmed', 'checked_in', 'pending'] },
      $or: [{ checkInDate: { $lt: new Date(checkOut) }, checkOutDate: { $gt: new Date(checkIn) } }],
    }).select('room');
    const bookedRoomIds = overlappingBookings.map(b => b.room.toString());
    if (bookedRoomIds.length) query._id = { $nin: bookedRoomIds };
  }

  const sortObj = sort.startsWith('-') ? { [sort.slice(1)]: -1 } : { [sort]: 1 };
  const skip = (page - 1) * limit;

  const [rooms, total] = await Promise.all([
    Room.find(query)
      .populate('hotel', 'name address starRating checkInTime checkOutTime')
      .sort(sortObj)
      .skip(skip)
      .limit(Number(limit)),
    Room.countDocuments(query),
  ]);

  res.json({
    success: true,
    count: rooms.length,
    total,
    totalPages: Math.ceil(total / Number(limit)),
    currentPage: Number(page),
    rooms,
  });
});

// @desc    Get single room
// @route   GET /api/rooms/:id
// @access  Public
exports.getRoom = asyncHandler(async (req, res, next) => {
  const room = await Room.findById(req.params.id).populate('hotel');
  if (!room || !room.isActive) return next(createError('Room not found', 404));
  res.json({ success: true, room });
});

// @desc    Create room
// @route   POST /api/rooms
// @access  Private (admin, hotel_manager)
exports.createRoom = asyncHandler(async (req, res, next) => {
  const hotel = await Hotel.findById(req.body.hotel);
  if (!hotel) return next(createError('Hotel not found', 404));

  // Check duplicate room number within hotel
  const existing = await Room.findOne({ hotel: req.body.hotel, roomNumber: req.body.roomNumber });
  if (existing) return next(createError('Room number already exists in this hotel', 400));

  // Handle images
  if (req.files?.roomImages) {
    req.body.images = req.files.roomImages.map(f => `/uploads/rooms/${f.filename}`);
  }

  const room = await Room.create(req.body);
  await Hotel.findByIdAndUpdate(req.body.hotel, { $inc: { totalRooms: 1 } });

  res.status(201).json({ success: true, message: 'Room created successfully', room });
});

// @desc    Update room
// @route   PUT /api/rooms/:id
// @access  Private (admin, hotel_manager, staff)
exports.updateRoom = asyncHandler(async (req, res, next) => {
  let room = await Room.findById(req.params.id);
  if (!room) return next(createError('Room not found', 404));

  if (req.files?.roomImages) {
    req.body.images = req.files.roomImages.map(f => `/uploads/rooms/${f.filename}`);
  }

  room = await Room.findByIdAndUpdate(req.params.id, req.body, {
    new: true, runValidators: true,
  }).populate('hotel', 'name');

  res.json({ success: true, message: 'Room updated', room });
});

// @desc    Delete room (soft delete)
// @route   DELETE /api/rooms/:id
// @access  Private (admin, hotel_manager)
exports.deleteRoom = asyncHandler(async (req, res, next) => {
  const room = await Room.findById(req.params.id);
  if (!room) return next(createError('Room not found', 404));

  const activeBookings = await Booking.countDocuments({
    room: req.params.id,
    status: { $in: ['confirmed', 'checked_in'] },
  });
  if (activeBookings > 0) {
    return next(createError('Cannot delete room with active bookings', 400));
  }

  room.isActive = false;
  await room.save();
  await Hotel.findByIdAndUpdate(room.hotel, { $inc: { totalRooms: -1 } });

  res.json({ success: true, message: 'Room removed successfully' });
});

// @desc    Update room status
// @route   PATCH /api/rooms/:id/status
// @access  Private (staff, hotel_manager, admin)
exports.updateRoomStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;
  const room = await Room.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true, runValidators: true }
  );
  if (!room) return next(createError('Room not found', 404));
  res.json({ success: true, message: `Room status updated to ${status}`, room });
});

// @desc    Get rooms by hotel with occupancy stats
// @route   GET /api/rooms/hotel/:hotelId/stats
// @access  Private (staff, hotel_manager, admin)
exports.getRoomStats = asyncHandler(async (req, res) => {
  const stats = await Room.aggregate([
    { $match: { hotel: require('mongoose').Types.ObjectId.createFromHexString(req.params.hotelId), isActive: true } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const totalRooms = await Room.countDocuments({ hotel: req.params.hotelId, isActive: true });
  const occupiedRooms = stats.find(s => s._id === 'occupied')?.count || 0;
  const occupancyRate = totalRooms > 0 ? ((occupiedRooms / totalRooms) * 100).toFixed(1) : 0;

  res.json({ success: true, stats, totalRooms, occupancyRate: `${occupancyRate}%` });
});
