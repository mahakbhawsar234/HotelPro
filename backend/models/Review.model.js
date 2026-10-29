const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  guest:   { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  hotel:   { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel',   required: true },
  room:    { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  rating:  { type: Number, required: true, min: 1, max: 5 },
  title:   { type: String, maxlength: 100 },
  comment: { type: String, required: true, maxlength: 1000 },
  ratings: {
    cleanliness: { type: Number, min: 1, max: 5 },
    service:     { type: Number, min: 1, max: 5 },
    location:    { type: Number, min: 1, max: 5 },
    value:       { type: Number, min: 1, max: 5 },
    amenities:   { type: Number, min: 1, max: 5 },
  },
  images:     [{ type: String }],
  isVerified: { type: Boolean, default: false },
  isPublished:{ type: Boolean, default: true },
  helpfulVotes: { type: Number, default: 0 },
  response: {
    text:         String,
    respondedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    respondedAt:  Date,
  },
}, { timestamps: true });

// Prevent duplicate reviews per booking
reviewSchema.index({ booking: 1, guest: 1 }, { unique: true });
reviewSchema.index({ hotel: 1, rating: -1 });

module.exports = mongoose.model('Review', reviewSchema);
