const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: [true, 'First name is required'], trim: true, maxlength: 50 },
  lastName:  { type: String, required: [true, 'Last name is required'],  trim: true, maxlength: 50 },
  email:     { type: String, required: [true, 'Email is required'], unique: true, lowercase: true,
               match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'] },
  password:  { type: String, required: [true, 'Password is required'], minlength: 6, select: false },
  phone:     { type: String, trim: true },
  role:      { type: String, enum: ['guest', 'staff', 'hotel_manager', 'admin'], default: 'guest' },
  avatar:    { type: String, default: '' },
  isActive:  { type: Boolean, default: true },
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationToken: String,
  emailVerificationExpire: Date,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  lastLogin: Date,
  hotelId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel' }, // for staff/managers
  address: {
    street: String, city: String, state: String, country: String, zipCode: String,
  },
  preferences: {
    roomType: String, floor: String, specialRequests: String,
  },
  loyaltyPoints: { type: Number, default: 0 },
  totalBookings:  { type: Number, default: 0 },
}, { timestamps: true });

// Hash password before save
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password
userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT
userSchema.methods.generateJWT = function() {
  return jwt.sign(
    { id: this._id, role: this.role, email: this.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// Generate email verification token
userSchema.methods.generateEmailVerificationToken = function() {
  const token = require('crypto').randomBytes(32).toString('hex');
  this.emailVerificationToken = require('crypto').createHash('sha256').update(token).digest('hex');
  this.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  return token;
};

// Generate password reset token
userSchema.methods.generatePasswordResetToken = function() {
  const token = require('crypto').randomBytes(32).toString('hex');
  this.resetPasswordToken = require('crypto').createHash('sha256').update(token).digest('hex');
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
  return token;
};

// Virtual: full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

module.exports = mongoose.model('User', userSchema);
