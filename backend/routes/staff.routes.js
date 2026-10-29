const express = require('express');
const router  = express.Router();
const { createServiceRequest, getServiceRequests, updateServiceRequest } = require('../controllers/service.controller');
const { getStaffList, getStaffDashboard, assignStaffToService } = require('../controllers/staff.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// Service requests
router.post('/services',        protect, createServiceRequest);
router.get('/services',         protect, getServiceRequests);
router.put('/services/:id',     protect, authorize('staff','hotel_manager','admin'), updateServiceRequest);

// Staff management
router.get('/list',             protect, authorize('admin','hotel_manager'), getStaffList);
router.get('/dashboard',        protect, authorize('staff','hotel_manager'), getStaffDashboard);
router.post('/assign',          protect, authorize('hotel_manager','admin'), assignStaffToService);

module.exports = router;
