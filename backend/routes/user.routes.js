const express = require('express');
const router  = express.Router();
const { getProfile, updateProfile, getUserById } = require('../controllers/user.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

router.get('/profile',    protect, getProfile);
router.put('/profile',    protect, upload.single('avatar'), updateProfile);
router.get('/:id',        protect, authorize('admin','hotel_manager'), getUserById);

module.exports = router;
