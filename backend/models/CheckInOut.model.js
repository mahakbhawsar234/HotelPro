const mongoose = require('mongoose');

const checkInOutSchema = new mongoose.Schema({
  booking:   { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  guest:     { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  hotel:     { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel',   required: true },
  room:      { type: mongoose.Schema.Types.ObjectId, ref: 'Room',    required: true },
  type:      { type: String, enum: ['check_in', 'check_out'], required: true },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  actualTime:  { type: Date, default: Date.now },
  idProofType: { type: String, enum: ['passport', 'aadhar', 'driving_license', 'voter_id', 'pan'] },
  idProofNumber: { type: String },
  idProofImage:  { type: String },
  guestSignature: { type: String },
  roomCondition:  { type: String, enum: ['excellent', 'good', 'fair', 'damaged'], default: 'excellent' },
  damageNotes:    { type: String },
  keyCardIssued:  { type: Number, default: 1 },
  earlyLateCharge: { type: Number, default: 0 },
  notes:          { type: String },
}, { timestamps: true });

module.exports = mongoose.model('CheckInOut', checkInOutSchema);
