const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  booking:        { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  user:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  hotel:          { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
  amount:         { type: Number, required: true },
  currency:       { type: String, default: 'INR' },
  paymentMethod:  { type: String, enum: ['razorpay', 'cash', 'card', 'upi', 'bank_transfer'], default: 'razorpay' },
  status:         { type: String, enum: ['pending', 'completed', 'failed', 'refunded', 'partially_refunded'], default: 'pending' },
  // Razorpay fields
  razorpayOrderId:   { type: String },
  razorpayPaymentId: { type: String },
  razorpaySignature: { type: String },
  // Refund fields
  refundAmount:   { type: Number, default: 0 },
  refundReason:   { type: String },
  refundedAt:     { type: Date },
  razorpayRefundId: { type: String },
  // Invoice
  invoiceNumber:  { type: String },
  invoiceUrl:     { type: String },
  notes:          { type: String },
  metadata:       { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

// Auto invoice number
paymentSchema.pre('save', async function() {
  if (!this.invoiceNumber && this.status === 'completed') {
    const count = await mongoose.model('Payment').countDocuments();
    this.invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;
  }
});

paymentSchema.index({ booking: 1 });
paymentSchema.index({ user: 1, status: 1 });
paymentSchema.index({ hotel: 1, createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
