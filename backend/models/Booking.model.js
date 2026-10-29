const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  bookingRef:   { type: String, unique: true },
  guest:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  hotel:        { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
  room:         { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  checkInDate:  { type: Date, required: true },
  checkOutDate: { type: Date, required: true },
  numberOfNights: { type: Number },
  numberOfGuests: { type: Number, required: true, default: 1 },
  adults:       { type: Number, default: 1 },
  children:     { type: Number, default: 0 },
  roomPrice:    { type: Number, required: true },
  taxAmount:    { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  totalAmount:  { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'],
    default: 'pending',
  },
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'partially_paid', 'paid', 'refunded', 'failed'],
    default: 'unpaid',
  },
  specialRequests: { type: String },
  guestNotes:      { type: String },
  staffNotes:      { type: String },
  cancellationReason: { type: String },
  cancelledAt:     { type: Date },
  cancelledBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  confirmedAt:     { type: Date },
  modifiedAt:      { type: Date },
  addons: [{
    name: String, price: Number, quantity: { type: Number, default: 1 },
  }],
  invoiceUrl: { type: String },
  source:     { type: String, enum: ['direct', 'online', 'agent', 'walk_in'], default: 'online' },
}, { timestamps: true });

// Auto-generate booking reference
bookingSchema.pre('save', async function() {
  if (!this.bookingRef) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    this.bookingRef = `HP-${timestamp}-${random}`;
  }
  if (this.checkInDate && this.checkOutDate) {
    const diff = Math.ceil((this.checkOutDate - this.checkInDate) / (1000 * 60 * 60 * 24));
    this.numberOfNights = diff;
  }
});

bookingSchema.index({ guest: 1, status: 1 });
bookingSchema.index({ hotel: 1, checkInDate: 1, checkOutDate: 1 });
bookingSchema.index({ room: 1, checkInDate: 1, checkOutDate: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
