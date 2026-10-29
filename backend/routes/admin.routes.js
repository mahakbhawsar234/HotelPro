const express = require('express');
const router  = express.Router();
const { getAllUsers, updateUser, toggleUserStatus, createStaff, getSystemStats } = require('../controllers/admin.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect, authorize('admin'));

router.get('/stats',          getSystemStats);
router.get('/users',          getAllUsers);
router.put('/users/:id',      updateUser);
router.patch('/users/:id/toggle', toggleUserStatus);
router.post('/staff',         createStaff);

module.exports = router;
