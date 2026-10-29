const mongoose = require('mongoose');

const hotelSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  description: { type: String, required: true },
  address: {
    street:  { type: String, required: true },
    city:    { type: String, required: true },
    state:   { type: String, required: true },
    country: { type: String, required: true, default: 'India' },
    zipCode: { type: String, required: true },
    coordinates: {
      lat: Number, lng: Number,
    },
  },
  phone:   { type: String, required: true },
  email:   { type: String, required: true },
  website: { type: String },
  starRating: { type: Number, min: 1, max: 5, default: 3 },
  amenities:  [{ type: String }],
  images:     [{ type: String }],
  coverImage: { type: String, default: '' },
  manager:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isActive:   { type: Boolean, default: true },
  checkInTime:  { type: String, default: '14:00' },
  checkOutTime: { type: String, default: '11:00' },
  policies: {
    cancellation: { type: String },
    pets:         { type: String, default: 'Not allowed' },
    smoking:      { type: String, default: 'Not allowed' },
    extraBed:     { type: String },
  },
  totalRooms: { type: Number, default: 0 },
  avgRating:  { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
  taxPercent:   { type: Number, default: 18 }, // GST
}, { timestamps: true });

hotelSchema.index({ 'address.city': 1, isActive: 1 });

module.exports = mongoose.model('Hotel', hotelSchema);
