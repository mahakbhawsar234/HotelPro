const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  hotel:     { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
  booking:   { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  guest:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  room:      { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  type: {
    type: String,
    enum: ['room_service', 'housekeeping', 'laundry', 'spa', 'transport', 'concierge', 'maintenance', 'other'],
    required: true,
  },
  title:       { type: String, required: true },
  description: { type: String },
  status: {
    type: String,
    enum: ['requested', 'assigned', 'in_progress', 'completed', 'cancelled'],
    default: 'requested',
  },
  priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  requestedAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
  charge:      { type: Number, default: 0 },
  notes:       { type: String },
  feedback:    { type: String },
  rating:      { type: Number, min: 1, max: 5 },
}, { timestamps: true });

module.exports = mongoose.model('Service', serviceSchema);
