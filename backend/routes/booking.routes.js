const express = require('express');
const router  = express.Router();
const { createBooking, getBookings, getBooking, cancelBooking, updateBooking, checkAvailability, getUpcomingCheckIns } = require('../controllers/booking.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.post('/',                   protect, authorize('guest'), createBooking);
router.get('/',                    protect, getBookings);
router.get('/upcoming',            protect, authorize('admin','hotel_manager','staff'), getUpcomingCheckIns);
router.get('/availability/:roomId',checkAvailability);
router.get('/:id',                 protect, getBooking);
router.put('/:id',                 protect, authorize('admin','hotel_manager','staff'), updateBooking);
router.put('/:id/cancel',          protect, cancelBooking);

module.exports = router;
