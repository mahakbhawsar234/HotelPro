const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

const app = express();

// ─── Security Middleware ──────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// ─── Core Middleware ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));

// ─── Static Files ─────────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',         require('./routes/auth.routes'));
app.use('/api/users',        require('./routes/user.routes'));
app.use('/api/hotels',       require('./routes/hotel.routes'));
app.use('/api/rooms',        require('./routes/room.routes'));
app.use('/api/bookings',     require('./routes/booking.routes'));
app.use('/api/payments',     require('./routes/payment.routes'));
app.use('/api/reviews',      require('./routes/review.routes'));
app.use('/api/staff',        require('./routes/staff.routes'));
app.use('/api/admin',        require('./routes/admin.routes'));
app.use('/api/notifications',require('./routes/notification.routes'));
app.use('/api/checkin',      require('./routes/checkin.routes'));
app.use('/api/reports',      require('./routes/report.routes'));
app.use('/api/services',     require('./routes/service.routes'));

// ─── Root & Health Check ───────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    success: true,
    name: 'HotelPro API Server',
    status: 'online',
    version: '1.0.0',
    documentation: {
      health: '/api/health',
      auth: '/api/auth',
      hotels: '/api/hotels',
      rooms: '/api/rooms',
      bookings: '/api/bookings',
      payments: '/api/payments',
      reports: '/api/reports',
      admin: '/api/admin',
    },
    clientApp: process.env.CLIENT_URL || 'http://localhost:3000',
    timestamp: new Date(),
  });
});

app.get('/api', (req, res) => {
  res.redirect('/');
});

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'HotelPro API is running', timestamp: new Date() });
});

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Global Error:', err);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ─── Server & Database Startup ────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`🚀 HotelPro Server running on http://localhost:${PORT}`);
  console.log(`📖 Environment: ${process.env.NODE_ENV || 'development'}`);
});

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/hotelpro';
mongoose.connect(mongoUri)
  .then(() => {
    console.log('✅ MongoDB Connected successfully');
  })
  .catch(err => {
    console.error('⚠️  MongoDB Connection Warning:', err.message);
    console.error('👉 Ensure MongoDB service is running (e.g. `mongod` or MongoDB Compass/Atlas).');
  });

module.exports = app;
