const User    = require('../models/User.model');
const Booking = require('../models/Booking.model');
const Service = require('../models/Service.model');
const { asyncHandler, createError } = require('../utils/helpers.util');

exports.getStaffList = asyncHandler(async (req, res) => {
  const query = { role: { $in: ['staff', 'hotel_manager'] } };
  if (req.user.role === 'hotel_manager') query.hotelId = req.user.hotelId;

  const staff = await User.find(query).populate('hotelId', 'name').sort({ firstName: 1 });
  res.json({ success: true, count: staff.length, staff });
});

exports.getStaffDashboard = asyncHandler(async (req, res) => {
  const hotelId = req.user.hotelId;
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));

  const [pendingCheckIns, pendingServices, activeBookings, staffList] = await Promise.all([
    Booking.countDocuments({ hotel: hotelId, status: 'confirmed', checkInDate: { $gte: startOfDay } }),
    Service.countDocuments({ hotel: hotelId, status: { $in: ['requested', 'assigned', 'in_progress'] } }),
    Booking.countDocuments({ hotel: hotelId, status: 'checked_in' }),
    User.countDocuments({ hotelId, role: 'staff', isActive: true }),
  ]);

  res.json({
    success: true,
    dashboard: { pendingCheckIns, pendingServices, activeBookings, staffList },
  });
});

exports.assignStaffToService = asyncHandler(async (req, res, next) => {
  const { staffId, serviceId } = req.body;
  const service = await Service.findByIdAndUpdate(
    serviceId,
    { assignedTo: staffId, status: 'assigned' },
    { new: true }
  ).populate('assignedTo', 'firstName lastName');
  if (!service) return next(createError('Service not found', 404));
  res.json({ success: true, message: 'Staff assigned to service', service });
});
