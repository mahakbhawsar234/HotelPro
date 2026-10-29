const express = require('express');
const router  = express.Router();
const { getRooms, getRoom, createRoom, updateRoom, deleteRoom, updateRoomStatus, getRoomStats } = require('../controllers/room.controller');
const { protect, authorize, optionalAuth } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

router.get('/',                 optionalAuth, getRooms);
router.get('/hotel/:hotelId/stats', protect, authorize('admin','hotel_manager','staff'), getRoomStats);
router.get('/:id',              getRoom);
router.post('/',                protect, authorize('admin','hotel_manager'), upload.fields([{name:'roomImages',maxCount:8}]), createRoom);
router.put('/:id',              protect, authorize('admin','hotel_manager'), upload.fields([{name:'roomImages',maxCount:8}]), updateRoom);
router.patch('/:id/status',     protect, authorize('admin','hotel_manager','staff'), updateRoomStatus);
router.delete('/:id',           protect, authorize('admin','hotel_manager'), deleteRoom);

module.exports = router;
