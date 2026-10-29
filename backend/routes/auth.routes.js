const express = require('express');
const router = express.Router();
const {
  register, login, logout, getMe,
  verifyEmail, forgotPassword, resetPassword, updatePassword,
} = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/register',         register);
router.post('/login',            login);
router.post('/logout',           protect, logout);
router.get('/me',                protect, getMe);
router.get('/verify-email/:token', verifyEmail);
router.post('/forgot-password',  forgotPassword);
router.put('/reset-password/:token', resetPassword);
router.put('/update-password',   protect, updatePassword);

module.exports = router;
