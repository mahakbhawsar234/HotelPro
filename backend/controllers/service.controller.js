const Service = require('../models/Service.model');
const Notification = require('../models/Notification.model');
const { asyncHandler, createError } = require('../utils/helpers.util');

exports.createServiceRequest = asyncHandler(async (req, res) => {
  const service = await Service.create({ ...req.body, guest: req.user._id });
  res.status(201).json({ success: true, message: 'Service request submitted', service });
});

exports.getServiceRequests = asyncHandler(async (req, res) => {
  const { status, type, page = 1, limit = 20 } = req.query;
  const query = {};
  if (req.user.role === 'guest') query.guest = req.user._id;
  else if (req.user.role === 'staff') query.hotel = req.user.hotelId;
  if (status) query.status = status;
  if (type)   query.type   = type;

  const skip = (page - 1) * limit;
  const [services, total] = await Promise.all([
    Service.find(query)
      .populate('guest', 'firstName lastName')
      .populate('room', 'roomNumber')
      .populate('assignedTo', 'firstName lastName')
      .sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Service.countDocuments(query),
  ]);
  res.json({ success: true, total, totalPages: Math.ceil(total / limit), services });
});

exports.updateServiceRequest = asyncHandler(async (req, res, next) => {
  const service = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true })
    .populate('guest', 'firstName lastName');
  if (!service) return next(createError('Service request not found', 404));

  if (req.body.status === 'completed' && service.guest) {
    await Notification.create({
      recipient: service.guest._id,
      type: 'system_alert',
      title: 'Service Request Completed ✅',
      message: `Your ${service.type.replace('_', ' ')} request has been completed.`,
    });
  }
  res.json({ success: true, message: 'Service request updated', service });
});
