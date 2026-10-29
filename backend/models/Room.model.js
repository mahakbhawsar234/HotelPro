const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  hotel:        { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
  roomNumber:   { type: String, required: true },
  category:     { type: String, required: true,
                  enum: ['Standard', 'Deluxe', 'Suite', 'Executive', 'Presidential', 'Family', 'Studio'] },
  type:         { type: String, enum: ['Single', 'Double', 'Twin', 'Triple', 'King', 'Queen'], default: 'Double' },
  floor:        { type: Number, required: true },
  description:  { type: String },
  pricePerNight: { type: Number, required: true, min: 0 },
  weekendPrice:  { type: Number },
  seasonalPrices: [{
    name:      String,
    startDate: Date,
    endDate:   Date,
    price:     Number,
  }],
  maxOccupancy:  { type: Number, default: 2 },
  size:          { type: Number }, // sq ft
  amenities:     [{ type: String }],
  images:        [{ type: String }],
  status: {
    type: String,
    enum: ['available', 'occupied', 'cleaning', 'maintenance', 'out_of_order'],
    default: 'available',
  },
  isActive:      { type: Boolean, default: true },
  avgRating:     { type: Number, default: 0 },
  totalReviews:  { type: Number, default: 0 },
  bedType:       { type: String },
  view:          { type: String },  // sea, garden, city, pool
  smokingAllowed: { type: Boolean, default: false },
}, { timestamps: true });

roomSchema.index({ hotel: 1, status: 1 });
roomSchema.index({ hotel: 1, category: 1, pricePerNight: 1 });

module.exports = mongoose.model('Room', roomSchema);
