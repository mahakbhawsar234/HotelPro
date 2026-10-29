const express = require('express');
const router  = express.Router();
const { getHotels, getHotel, createHotel, updateHotel, deleteHotel, getHotelReviews } = require('../controllers/hotel.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

router.get('/',     getHotels);
router.get('/:id',  getHotel);
router.get('/:id/reviews', getHotelReviews);
router.post('/',    protect, authorize('admin', 'hotel_manager'), upload.fields([{ name: 'hotelImages', maxCount: 10 }]), createHotel);
router.put('/:id',  protect, authorize('admin', 'hotel_manager'), upload.fields([{ name: 'hotelImages', maxCount: 10 }]), updateHotel);
router.delete('/:id', protect, authorize('admin'), deleteHotel);

module.exports = router;
