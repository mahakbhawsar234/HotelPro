const express = require('express');
const router  = express.Router();
const { createReview, getReviews, addStaffResponse } = require('../controllers/review.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

router.get('/',     getReviews);
router.post('/',    protect, authorize('guest'), upload.array('images', 5), createReview);
router.put('/:id/response', protect, authorize('staff','hotel_manager','admin'), addStaffResponse);

module.exports = router;
