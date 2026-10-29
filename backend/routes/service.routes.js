const express = require('express');
const router  = express.Router();
const { createServiceRequest, getServiceRequests, updateServiceRequest } = require('../controllers/service.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.post('/',    protect, createServiceRequest);
router.get('/',     protect, getServiceRequests);
router.put('/:id',  protect, authorize('staff','hotel_manager','admin'), updateServiceRequest);

module.exports = router;
