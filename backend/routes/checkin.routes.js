const express = require('express');
const router  = express.Router();
const { processCheckIn, processCheckOut, getTodayActivity, getCheckInOutRecords } = require('../controllers/checkin.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

router.use(protect, authorize('admin','hotel_manager','staff'));

router.post('/',           upload.single('idProof'), processCheckIn);
router.post('/checkout',   processCheckOut);
router.get('/today',       getTodayActivity);
router.get('/',            getCheckInOutRecords);

module.exports = router;
