const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sender:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: {
    type: String,
    enum: [
      'booking_confirmed', 'booking_cancelled', 'booking_modified',
      'check_in_reminder', 'check_out_reminder',
      'payment_success', 'payment_failed', 'refund_processed',
      'review_request', 'new_message', 'system_alert',
      'staff_assignment', 'room_ready', 'service_request',
    ],
    required: true,
  },
  title:   { type: String, required: true },
  message: { type: String, required: true },
  data:    { type: mongoose.Schema.Types.Mixed }, // extra payload (bookingId, roomId, etc.)
  isRead:  { type: Boolean, default: false },
  readAt:  { type: Date },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
}, { timestamps: true });

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
