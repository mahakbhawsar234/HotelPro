const Booking = require('../models/Booking.model');
const Payment = require('../models/Payment.model');
const Room    = require('../models/Room.model');
const User    = require('../models/User.model');
const Hotel   = require('../models/Hotel.model');
const Review  = require('../models/Review.model');
const { asyncHandler, createError } = require('../utils/helpers.util');
const mongoose = require('mongoose');

// @desc    Admin/Manager Dashboard stats
// @route   GET /api/reports/dashboard
// @access  Private (admin, hotel_manager)
exports.getDashboardStats = asyncHandler(async (req, res) => {
  const hotelFilter = req.user.role === 'hotel_manager' ? { hotel: req.user.hotelId } : {};
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth   = new Date(now.getFullYear(), now.getMonth(), 0);

  const [
    totalBookings,
    pendingBookings,
    confirmedBookings,
    cancelledBookings,
    totalRevenue,
    monthlyRevenue,
    lastMonthRevenue,
    totalGuests,
    totalRooms,
    availableRooms,
    occupiedRooms,
    avgRating,
    recentBookings,
  ] = await Promise.all([
    Booking.countDocuments(hotelFilter),
    Booking.countDocuments({ ...hotelFilter, status: 'pending' }),
    Booking.countDocuments({ ...hotelFilter, status: { $in: ['confirmed', 'checked_in'] } }),
    Booking.countDocuments({ ...hotelFilter, status: 'cancelled' }),
    Payment.aggregate([
      { $match: { ...(req.user.role === 'hotel_manager' ? { hotel: new mongoose.Types.ObjectId(req.user.hotelId) } : {}), status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Payment.aggregate([
      { $match: { ...(req.user.role === 'hotel_manager' ? { hotel: new mongoose.Types.ObjectId(req.user.hotelId) } : {}), status: 'completed', createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Payment.aggregate([
      { $match: { ...(req.user.role === 'hotel_manager' ? { hotel: new mongoose.Types.ObjectId(req.user.hotelId) } : {}), status: 'completed', createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    User.countDocuments({ role: 'guest' }),
    Room.countDocuments({ ...(req.user.role === 'hotel_manager' ? { hotel: req.user.hotelId } : {}), isActive: true }),
    Room.countDocuments({ ...(req.user.role === 'hotel_manager' ? { hotel: req.user.hotelId } : {}), isActive: true, status: 'available' }),
    Room.countDocuments({ ...(req.user.role === 'hotel_manager' ? { hotel: req.user.hotelId } : {}), isActive: true, status: 'occupied' }),
    Review.aggregate([
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]),
    Booking.find(hotelFilter)
      .populate('guest', 'firstName lastName email avatar')
      .populate('room', 'roomNumber category')
      .populate('hotel', 'name')
      .sort({ createdAt: -1 })
      .limit(5),
  ]);

  const totalRev = totalRevenue[0]?.total || 0;
  const monthlyRev = monthlyRevenue[0]?.total || 0;
  const lastMonthRev = lastMonthRevenue[0]?.total || 0;
  const revenueGrowth = lastMonthRev > 0 ? (((monthlyRev - lastMonthRev) / lastMonthRev) * 100).toFixed(1) : 0;
  const occupancyRate = totalRooms > 0 ? ((occupiedRooms / totalRooms) * 100).toFixed(1) : 0;

  res.json({
    success: true,
    stats: {
      bookings: { total: totalBookings, pending: pendingBookings, confirmed: confirmedBookings, cancelled: cancelledBookings },
      revenue:  { total: totalRev, monthly: monthlyRev, lastMonth: lastMonthRev, growth: `${revenueGrowth}%` },
      rooms:    { total: totalRooms, available: availableRooms, occupied: occupiedRooms, occupancyRate: `${occupancyRate}%` },
      guests:   { total: totalGuests },
      rating:   { avg: (avgRating[0]?.avg || 0).toFixed(1), count: avgRating[0]?.count || 0 },
    },
    recentBookings,
  });
});

// @desc    Monthly revenue chart data
// @route   GET /api/reports/revenue
// @access  Private (admin, hotel_manager)
exports.getRevenueReport = asyncHandler(async (req, res) => {
  const { year = new Date().getFullYear() } = req.query;
  const matchStage = { status: 'completed', createdAt: { $gte: new Date(`${year}-01-01`), $lte: new Date(`${year}-12-31`) } };
  if (req.user.role === 'hotel_manager') matchStage.hotel = new mongoose.Types.ObjectId(req.user.hotelId);

  const monthly = await Payment.aggregate([
    { $match: matchStage },
    { $group: { _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } }, revenue: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { '_id.month': 1 } },
  ]);

  // Fill all 12 months
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const chartData = months.map((name, i) => {
    const found = monthly.find(m => m._id.month === i + 1);
    return { month: name, revenue: found?.revenue || 0, bookings: found?.count || 0 };
  });

  res.json({ success: true, year: Number(year), chartData });
});

// @desc    Occupancy report
// @route   GET /api/reports/occupancy
// @access  Private (admin, hotel_manager)
exports.getOccupancyReport = asyncHandler(async (req, res) => {
  const hotelId = req.user.hotelId || req.query.hotelId;
  const hotelFilter = hotelId ? { hotel: new mongoose.Types.ObjectId(hotelId) } : {};

  const byCategory = await Room.aggregate([
    { $match: { ...hotelFilter, isActive: true } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const categoryRevenue = await Booking.aggregate([
    { $match: { status: { $in: ['confirmed', 'checked_in', 'checked_out'] }, ...hotelFilter } },
    { $lookup: { from: 'rooms', localField: 'room', foreignField: '_id', as: 'room' } },
    { $unwind: '$room' },
    { $group: { _id: '$room.category', count: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
    { $sort: { revenue: -1 } },
  ]);

  res.json({ success: true, byStatus: byCategory, byCategory: categoryRevenue });
});

// @desc    Booking trends report
// @route   GET /api/reports/bookings
// @access  Private (admin, hotel_manager)
exports.getBookingReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 3));
  const end   = endDate   ? new Date(endDate)   : new Date();

  const hotelFilter = req.user.role === 'hotel_manager' ? { hotel: new mongoose.Types.ObjectId(req.user.hotelId) } : {};

  const [byStatus, dailyTrend, topRooms] = await Promise.all([
    Booking.aggregate([
      { $match: { ...hotelFilter, createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: '$status', count: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
    ]),
    Booking.aggregate([
      { $match: { ...hotelFilter, createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
      { $sort: { _id: 1 } },
    ]),
    Booking.aggregate([
      { $match: { ...hotelFilter, status: { $in: ['confirmed', 'checked_out'] } } },
      { $group: { _id: '$room', count: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'rooms', localField: '_id', foreignField: '_id', as: 'room' } },
      { $unwind: '$room' },
    ]),
  ]);

  res.json({ success: true, byStatus, dailyTrend, topRooms });
});
