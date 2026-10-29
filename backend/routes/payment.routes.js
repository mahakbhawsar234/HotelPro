const express = require('express');
const router  = express.Router();
const { createOrder, verifyPayment, processRefund, getPayment, getPayments } = require('../controllers/payment.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.post('/create-order', protect, authorize('guest'), createOrder);
router.post('/verify',       protect, authorize('guest'), verifyPayment);
router.get('/',              protect, authorize('admin','hotel_manager'), getPayments);
router.get('/:id',           protect, getPayment);
router.post('/:id/refund',   protect, authorize('admin','hotel_manager'), processRefund);

module.exports = router;
