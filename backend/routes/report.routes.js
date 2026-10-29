const express = require('express');
const router  = express.Router();
const { getDashboardStats, getRevenueReport, getOccupancyReport, getBookingReport } = require('../controllers/report.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect, authorize('admin','hotel_manager'));

router.get('/dashboard',  getDashboardStats);
router.get('/revenue',    getRevenueReport);
router.get('/occupancy',  getOccupancyReport);
router.get('/bookings',   getBookingReport);

module.exports = router;
